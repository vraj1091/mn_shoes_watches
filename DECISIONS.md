# Decisions

Choices made where the brief left room, with the reason for each. Newest phase at the bottom.

## Before Phase 1 — schema and structure

**1. Prisma 7.10.1, not 8.**
npm's `latest` tag for Prisma points at 8.0.0-rc.27, a release candidate. A store's money and stock should not
run on a pre-release, so we pin 7.10.1 (the last stable) and move to 8 once it is final. Prisma 7 keeps the
database URL in `prisma.config.ts` and opens the SQLite file through `@prisma/adapter-better-sqlite3` (see 21).

**2. Better Auth, as two separate instances.**
Auth.js is now maintained by the Better Auth team and new projects are pointed to Better Auth, which ships the
pieces the brief needs as plugins: email OTP, phone OTP, Google, TOTP two-factor and database-backed rate limits.
Customers and staff get separate tables, separate cookies and separate sign-in endpoints (`/api/auth` and
`/api/admin-auth`), so a customer session can never reach the admin. Passwords (staff only) are hashed with
Argon2id through Better Auth's custom hasher hook, instead of its default scrypt.

**3. `storeId` is a plain indexed column, not a foreign key.**
Every business table has `storeId` defaulting to `"main"`, and every unique key that must become per-store
(slugs, SKUs, order numbers, coupon codes) already includes it. One exception: customer and staff email (and the
customer sign-in phone) are unique across the whole database, because Better Auth updates users by email alone
(see 25). Foreign keys to a `Store` row would
add 72 back-relation lines for no benefit while there is one store; adding them later is a cheap migration.
Left without `storeId`: auth session/account/verification rows (scoped through their user), pure join tables
(scoped through both sides) and the national PIN code directory.

**4. Guest checkouts create a customer record.**
Shopify works the same way: the owner sees every buyer under Customers, and segments (repeat buyers, high value,
inactive 90 days) include guests. When the guest later signs in with the same email or phone, the record becomes
an account and their past orders are already attached.

**5. GST uses tax classes with price slabs.**
HSN code and rate are never hard-coded. Each category (or product, as an override) points at a tax class such as
"Footwear", which holds the HSN code and one or more slabs, because in India the GST rate on some goods,
footwear included, depends on the price per unit. The owner enters the slabs with their accountant. By default the
slab is chosen on the taxable value per unit after discounts (the accountant should confirm this reading).
CGST + SGST applies when the delivery state is Gujarat (24), IGST otherwise.

**6. Invoice numbers are gapless per financial year.**
GST requires consecutive invoice numbers. A `Counter` row per series (`invoice:2026-27`, `credit-note:2026-27`) is
incremented in the same write transaction that creates the invoice; SQLite runs one write transaction at a time, so
two invoices can never get the same number. Returns produce credit notes in their own
series, never edits to the original invoice.

**7. Orders are created when the shopper presses Pay.**
Razorpay needs an order to attach to, and webhooks need something to update even if the shopper closes the tab.
These `PENDING_PAYMENT` orders are hidden from the admin's default view and expire after 30 minutes. The
customer-facing order number is assigned at creation; gaps in order numbers have no legal meaning (invoice numbers
are the ones that must be gapless, see 6).

**8. Stock reservations do not depend on a cleanup job.**
Opening checkout reserves the bag's items for 15 minutes. Available stock = on hand − reservations that are active
*and* not yet expired, so an expired reservation stops counting the moment it expires, even if no cron has run.
The stock check and the reservation happen in one write transaction, and SQLite runs one write transaction at a
time, so two buyers can never both get the last pair.

**9. Image sizes are generated at upload, not on request.**
Shared hosting limits CPU. Uploads are converted once with sharp into AVIF and WebP at fixed widths and stored next
to the original; `next/image` uses a custom loader that picks the right file. Pages still get responsive `srcset`,
blur placeholders and `fetchpriority="high"` on the main image.

**10. Uploads live outside the build folder.**
`UPLOADS_DIR` points at a persistent folder that survives redeploys. A route at `/media/…` serves it with long cache
headers; on a VPS, Nginx serves it directly. Setting `STORAGE_DRIVER=s3` moves new uploads to R2 or Bunny without code
changes.

**11. PIN code autofill uses a local table.**
City and state autofill at checkout comes from a `PinCode` table loaded from India Post's public PIN directory
(data.gov.in), not from a third-party API that could be slow or down during checkout. The import script runs in
Phase 3.

**12. Customer-facing pages use a CSP without per-request nonces.**
A nonce-based Content Security Policy forces every page to render per request, which would throw away the caching
that keeps product and category pages fast. Storefront pages get a strict policy (no plugins, no framing, fixed
script and connect origins, `base-uri` and `form-action` locked) that still allows Next.js's own inline bootstrap
script. The admin, which is always rendered per request, gets a nonce-based policy.

**13. The 120 KB JavaScript budget cannot hold as written.**
Measured in Phase 1 (`scripts/check-js-budget.mjs`): React DOM is 70 KB gzipped and the Next.js runtime 45 KB, so
the framework alone is about 115 KB before a single line of shop code. The Phase 1 home page loads 140 KB in total.
The budget is kept for the shop's own code instead: client components stay small islands, dialogs use the browser's
native `<dialog>` rather than a library, and icons render on the server (31). The owner decides whether the written
budget becomes "120 KB of shop code on top of the framework" or a total of about 160 KB.

**14. Rate limits and the job queue live in the database.**
cPanel/Passenger can run several Node processes, and each one would keep its own memory, so in-memory counters and
in-process timers are unreliable. Rate limits (login, OTP, coupon, checkout) use a `RateLimit` table shared with
Better Auth. Delayed work (cart reminders at 1 h and 24 h, review requests on day 5, scheduled publishing) goes into
a `Job` table that `/api/cron` drains, called every minute by the host's cron.

**15. Redirects are real 301s.**
Next.js's `permanentRedirect()` sends 308. To give the 301 the brief asks for, `proxy.ts` answers redirects from an
in-memory copy of the `Redirect` table, reloaded within a minute of any change. Slug changes and archived products
write their redirect automatically.

**16. Sitemap `lastmod` uses `contentUpdatedAt`.**
`updatedAt` changes on every write, including stock decrements and sales counters, which would make `lastmod`
meaningless. `contentUpdatedAt` changes only when something visible changes: text, images, price, or a switch between
in stock and out of stock.

**17. Wishlist works without signing in.**
The heart uses the same signed cookie as the bag, and the list merges into the account on sign-in. Forcing a sign-in
to save an item loses shoppers on phones.

**18. Small owner-edited lists are stored as JSON on their parent.**
FAQs, highlights, extra specs, opening hours and trust numbers are always edited and shown together with their
parent, never queried on their own. Each is validated by a Zod schema on save.

**19. Recently viewed is kept in the browser.**
It is per-device, needs no account and costs no database writes on every product view.

**20. Store location: Kalol, Gandhinagar district, Gujarat.**
Confirmed by the owner on 25 Oct 2026 (not the Kalol in Panchmahal district). Street address, PIN, phone, hours and
GSTIN are entered in admin Settings; the seed uses clearly marked placeholders until the owner provides them.

**21. SQLite instead of MySQL (owner's choice, 25 Oct 2026).**
The brief asked for MySQL; the owner chose SQLite so the store runs as one self-contained app on Hostinger's
Business ("Unlimited") web hosting plan, with no database server to set up. That plan runs up to 5 Node.js apps;
the Premium plan runs none, whatever the database. SQLite comfortably handles one shop's traffic and orders.
How it is set up:
- Database file, uploads and backups live in one data folder outside the app folder (`DATA_DIR`, e.g.
  `/home/<user>/mn-data/`), so a redeploy cannot overwrite them. Hostinger does not document what a redeploy
  keeps, so the first test deploy checks that this folder survives, before any real orders.
- Opened through better-sqlite3 in WAL mode with a busy timeout, so shoppers keep reading while an order is written.
  If the host's disk refuses WAL, the app falls back to SQLite's normal journal mode and `/api/health` says so.
- better-sqlite3 is a compiled module. It is installed during Hostinger's build (prebuilt Linux binaries), or built
  on GitHub Actions' Linux runner when we upload a ready build. The first test deploy checks this too.
- Daily backup with SQLite's online backup API (safe while the shop is open), 14 days kept. Because the database
  and its backups sit on the same server, the Owner also gets a "Download backup" button in Settings, and
  ADMIN_GUIDE.md asks for a weekly download to keep a copy off the server.
- The limit: everything runs on one server. If the shop ever needs several servers, the move is to MySQL or
  PostgreSQL: change the Prisma provider, regenerate migrations, switch the search adapter (22), copy the data.

**22. Search uses SQLite FTS5 with the trigram tokenizer.**
This replaces MySQL FULLTEXT. Trigram search matches part of a word, so "sneak" finds sneakers and "chrono" finds
chronographs as the shopper types, which suits search-as-you-type better than whole-word matching. Typos such as
"sneker" are handled by the owner's synonyms table. The search index lives in its own file, `search.db`, next to
the main database: tested on 25 Oct 2026, Prisma generates `DROP TABLE` for an FTS5 table in every new migration,
because it cannot model virtual tables. The index is filled from `Product.searchText` on every product save and can
be rebuilt from scratch at any time, so it needs no backup. Results are ranked with BM25, then boosted by stock and bestseller
score. All of it sits behind a search adapter, so Meilisearch or MySQL can replace it later.

## Phase 1 — Foundation

**23. Pages render at request time from cached data; the build never touches the database.**
Hostinger may build the app where the database is not (or before migrations have run), and a GitHub Actions
build has no database at all. So no page is prerendered from the database: every public read calls `connection()`
and then a `"use cache"` function tagged with what it read (`lib/data/*`). The first visitor after an admin edit
renders the page from the database; everyone after that gets it from the cache, until the next edit expires the tag.
The root layout is also request-time (`instant = false`), so Next.js sends no empty shell first. That keeps three
things a shop needs: every response carries its real status code, crawlers and visitors without JavaScript get the
whole page in the first HTML, and redirects are real HTTP redirects. Verified: `next build` passes with an empty
data folder and no secrets, and creates no files there. The cost: no prerendered shells, so a click waits for the
server render (a few milliseconds from cache) instead of showing a prefetched page instantly.

**24. A shared page cache in SQLite (`cache.db`).**
Next.js keeps `"use cache"` results and tag invalidations in each Node process's memory by default. A shared host
may run several processes and stops idle ones, so an admin edit would refresh only one process, and every restart
would start cold. `cache-handler.mjs` keeps entries and tag timestamps in `DATA_DIR/cache.db`: all processes see the
same invalidations, and the cache survives restarts. It is capped at 200 MB (oldest-read entries go first) and can
be deleted at any time.

**25. Better Auth constraints shaped the schema.**
Customer and staff emails are unique on their own (Better Auth updates users by email). The rate-limit timestamp
column is a `Float`, because a `BigInt` comes back as a JavaScript bigint and breaks Better Auth's arithmetic. The
staff two-factor table has the lockout columns Better Auth 1.7 expects; its schema check at start-up catches any
future mismatch.

**26. Sign-in rate limits per IP are generous; limits per code are strict.**
Indian mobile networks put many customers behind one shared IP address (carrier-grade NAT), so tight per-IP limits
would lock out strangers who happen to share an address. Each emailed or SMS code allows 5 tries and then becomes
void, which is what actually stops guessing; the per-IP limits (15 code requests and 30 sign-in attempts a minute)
only stop floods. Staff sign-in stays strict (10 attempts per 15 minutes) because staff sign in from the shop.

**27. Signing in or out reloads the page.**
Next.js prefetches visible links. A signed-out visitor's prefetched `/account` says "sign in first", and after
signing in a normal client navigation reused that stale answer (found by the end-to-end tests on desktop). Sign-in,
sign-out and two-factor steps now do a full page load, and personal links (account, wishlist, bag) are not
prefetched.

**28. Proxy redirects signed-out visitors before rendering.**
`proxy.ts` (Next.js 16's name for middleware) sends visitors without a session cookie from `/admin/*` and
`/account/*` to the right sign-in page with a real 307. It only checks that a cookie exists; every page still
verifies the session itself.

**29. Tool versions held back where the ecosystem has not caught up.**
TypeScript 6.0 rather than 7.0 (typescript-eslint supports up to 6.0), ESLint 9 rather than 10 (Next's ESLint
plugins), `@hookform/resolvers` 5 rather than 6 (6.0 ships a broken optional dependency). React Email moved to the
single `react-email` package; the old component packages are deprecated.

**30. A small message lookup instead of an i18n library.**
All storefront text is in `messages/en.json` and read through `lib/i18n.ts`, so Hindi and Gujarati are a matter of
adding `hi.json` and `gu.json`. Server components call `t()`; client components receive the strings they need as
props, so message files never reach the browser. A full library (with locale routing) can replace this when the
first translation is added.

**31. Icons render on the server.**
Phosphor's browser components carry all six weights of every icon. Icons are rendered as SVG on the server, and
interactive components receive them ready-made, so they add no JavaScript.

**32. Unknown shop details are bracketed placeholders, and the admin lists what is missing.**
Address, PIN code, GSTIN, phone and email are seeded as `[Street address]`, `+91 00000 00000` and so on. The admin
dashboard's "Before you take real orders" checklist reads them live and ticks each item once it is filled in. The
12 sample products carry the tag `sample`. Seeded GST rates are marked unverified.

**33. Tests read emails from an outbox, never from a real inbox.**
`EMAIL_TRANSPORT=outbox` writes emails to `DATA_DIR/outbox`. Only the end-to-end test server sets it; without SMTP
settings, production refuses to send rather than dropping email silently.

**34. Performance findings from Phase 1 measurements.**
- *Web fonts are not preloaded.* Text paints at once in a size-matched fallback and swaps to Bodoni and Hanken
  Grotesk without layout shift; preloading 80 KB of fonts made them compete with the page's scripts on slow networks.
- *CSS is not inlined.* Next.js's `inlineCss` also copied the stylesheet three more times into the page's React
  payload (+150 KB raw per page).
- *The root 404 stays small.* Next.js embeds it in every page as a ready fallback; with the full header and footer it
  doubled each page. Shop 404s get the full page from `app/(store)/not-found.tsx`.
- Result: home page HTML went from 54.5 KB to 16.8 KB gzipped.
- *Local Lighthouse numbers are unreliable on the development laptop.* On battery, Lighthouse rated its CPU between
  400 and 1,700 from one run to the next, so the same build scored 62 to 94. Budgets are enforced on the clean CI
  machine and confirmed with PageSpeed Insights on the live site.

**35. Prisma 7 no longer regenerates its client after `migrate`.**
A stale client caused the first Better Auth schema mismatch. `npm run db:migrate` and `db:migrate:dev` now run
`prisma generate` afterwards, and `npm install` runs it too.

## Phase 2 — Catalogue

**36. No brands: the shop is organised by category only (owner's choice, 25 Oct 2026).**
There are no brand pages, no Brands menu or footer link, no brand filter, and products have no brand field in the
seed or on the page. The `Brand` table stays in the schema, empty and unused, so brands could return later without a
data migration. Phase 5 needs a brand value for Google Merchant Center and Product structured data; that will be
settled with the owner then (the usual choice for unbranded stock is the shop's own name).

**37. Real 404s and 301s come from `proxy.ts`, not from the pages.**
Pages stream, so once rendering starts the status is fixed at 200. The proxy keeps a small route table (category
paths, collection landing paths, product slugs and statuses) read from SQLite through a read-only connection and
reloaded when `PRAGMA data_version` shows another connection wrote to the database. Unknown categories, products,
collections and file paths get a 404 with a plain HTML page (search box, departments, bestsellers) that the proxy
writes itself, because a rewrite to a Next.js page cannot carry a 404 status. Archived products with a replacement,
and collection URLs that have a landing path, get a 301. The only root files that pass are the ones `app/` serves
(`/robots.txt`, `/icon.svg`); a unit test checks that list against the folder.

**38. Listings filter, count and sort in memory from one cached catalogue index.**
Category, collection, sale and search pages all run on the same pure functions (`lib/catalog/query.ts`). Each
filter's counts ignore its own selection, so a shopper can widen a choice; size and colour count only in-stock
variants; sold-out products go last. Pages hold 24 products, with "Show more" for shoppers and numbered page links
that crawlers can follow.

**39. Filters are plain links and GET forms.**
`/mens-shoes?colour=black&size_uk=uk-9&price=2500-5000&in_stock=1&sort=price-asc` is shareable, works without
JavaScript, and is `noindex, follow` with its canonical on the clean category URL (Part 6). With JavaScript, the
desktop sidebar applies each change at once and phones use a bottom sheet with an Apply button.

**40. Search is SQLite FTS5 in its own file, with synonyms and spelling correction.**
The index (`search.db`) rebuilds itself whenever products or categories change, so no job is needed. Queries
expand through the owner's synonyms table; when nothing matches, the closest word from the catalogue's own
vocabulary is tried and the page says "Showing results for …". Suggestions (products, categories) arrive after two
characters; recent searches stay in the browser. Searches are logged after the response for the admin's
"no results" report.

**41. Product page choices.**
- *Sizes start unselected; colours start on the first in-stock one.* Pre-selecting a size causes wrong-size
  orders; the stock line says "Choose a size to see stock" until a size is picked.
- *The chosen variant goes into `?variant=`* so a shared link opens the same size and colour; the canonical URL is
  always the plain product URL.
- *Sold-out sizes stay visible, struck through*, and offer a one-time back-in-stock email.
- *The size chart is the product's own or the nearest category's*, so one chart covers all men's shoes.
- *"You may also like"* comes from the same category, widening up to the department (a shoe never suggests a
  perfume): in stock first, then closest in price, then bestsellers. "Complete the look" is the owner's picks.
- *Watches* draw the dial to scale on a 16–17 cm wrist and explain the water-resistance rating in words.
- *Perfumes* show top, heart and base notes as a pyramid.
- *The EMI line shows from ₹3,000*, the usual minimum for card EMI at Indian banks; Phase 3 replaces it with the
  payment gateway's real minimum.
- *The size-exchange line shows only for products with sizes.*
- *Until photos are uploaded (Phase 4)*, the gallery shows a plain tile with the product name, never a stock image.
  Those `<img>` tags become `next/image` with the custom loader (decision 9) when uploads arrive; the four lint
  warnings about them are expected until then.

**42. A basic robots.txt now, the full one in Phase 5.**
`/robots.txt` already blocks `/admin`, `/api/`, `/account`, `/cart`, `/checkout`, `/wishlist`, `/order` and
`/search`, because Lighthouse found that the missing file was answered with an HTML page and status 200. Phase 5
adds the crawler list editable in Settings and the sitemap index.

**43. Phase 2 measurements.**
- JavaScript, gzipped: product page 146.9 KB, category page 144.6 KB, home 142.0 KB. React and Next.js are
  115.5 KB of each; the shop's own code is about 31 KB, of which the product page adds 4.9 KB. This is within the
  120 KB budget if it counts the shop's code on top of the framework, and over it if it counts everything
  (decision 13).
- Lighthouse, mobile, median of 3 runs on this laptop: Accessibility, Best Practices and SEO 100 on home, category,
  landing and product pages. Performance 89–92 with simulated throttling; with real (DevTools) throttling the
  largest element paints at 1.5–1.6 s, inside the 2.5 s target, and the score is held back by about 0.5 s of
  main-thread work while React starts the page. That startup cost is the Phase 8 performance item.

## Storefront completion (brief of 26 Oct 2026)

**44. One colour source with light and dark modes.**
The owner replaced Ink, Cognac and Bottle Green with Graphite (neutrals), Oxford Navy (brand) and Brass (accent),
plus a sale/error red and an in-stock green used only for meaning. Every value lives once in
`lib/design/tokens.ts`. `npm run tokens` writes `app/theme.css` (Tailwind theme colours and the semantic CSS
variables) and `app/icon.svg`; emails, the proxy's 404 page and the 2FA QR code import the same values. A unit test
fails if the generated files are stale, if any file outside the tokens hard-codes a colour, or if any
text/background pair falls below WCAG AA. `npm run check:contrast` prints the same check. Two pairs in the brief
needed adjusting: rating stars use Brass 600 in light mode (Brass 500 is 2.8:1 on white, below the 3:1 graphics
minimum), and text on the photo tile stays Graphite 600 in both modes because the tile stays light. Form-field
borders use Graphite 600 in light mode so they reach 3:1 on the grey surface. Product colour swatches are product
data (the colour of the item), not theme colours, and are stored with the product.

**45. Theme switching uses next-themes with the class strategy.**
The default is the device setting; a choice is stored under the key the shop already used. next-themes sets the
class before the first paint, so there is no flash. The switch is a menu in the desktop header and the admin, and a
row of three buttons in the phone menu drawer (a fourth header icon would crowd the logo at 390 px). The serif
(Bodoni Moda) is kept for the hero, page titles and editorial section headings; product names, prices, navigation,
filters, buttons and the whole admin are set in Hanken Grotesk, with tabular numerals for prices.

**46. The mega menu floats on the raised surface above a dimmed page.**
Before, the panel used the page colour with a faint shadow, so in dark mode the category page underneath seemed to
run into it. It now uses the raised token, a border and the overlay shadow, dims the page below, and closes on
Escape, a click outside, the pointer leaving, and any route change (including back and forward).
