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
filters, buttons and the whole admin are set in Hanken Grotesk, with tabular numerals for prices. (Body font
now Instrument Sans: see 74.)

**46. The mega menu floats on the raised surface above a dimmed page.**
Before, the panel used the page colour with a faint shadow, so in dark mode the category page underneath seemed to
run into it. It now uses the raised token, a border and the overlay shadow, dims the page below, and closes on
Escape, a click outside, the pointer leaving, and any route change (including back and forward).

**47. Demo data comes from DummyJSON and is removable in one step.**
`npm run seed` fetches five DummyJSON categories, downloads every photo into `public/demo/` (6 MB, committed, so
the site never loads their CDN), converts prices with round(USD × 85 / 100) × 100 − 1 so they end in 99, and keeps
a compare-at price only for discounts of 8% or more. Titles and descriptions are rewritten in plain copy; the API
supplies only photos, prices, discounts and reviews. Generic DummyJSON brands are renamed (Heritage Time, Aurelle,
Solaris). Categories without DummyJSON photos get two products each with a generated SVG placeholder (the photo
tile colour, a line drawing and the name) marked `isPlaceholderPhoto`; the hand-written Oxford, Derby, Chelsea
boot, Kolhapuri, Oud Noir, Mitti attar and belt from Phase 2 are reused there. Every demo record carries
`isDemo`; `lib/demo/remove.ts` deletes exactly those (plus the older "sample" products) and is shared by the seed,
which resets demo data on each run, and by the admin's "Remove all demo data" button. Store structure (categories,
attributes, size charts, shipping zones, policy pages, settings) is not demo data and is kept. The API response is
saved in `prisma/demo/dummyjson.json`, so the seed also works offline. Brands came back with this brief
(it supersedes decision 36). Real brand names (Rolex, Chanel, Nike) are for local demonstration only and must be
removed before the shop goes live; the admin shows a banner while demo data exists.

**48. The Turbopack disk cache is off for `next dev`.**
With Next.js 16.4.3 on Windows, restarting the dev server with the cache from the previous run made every page
reload itself in a loop: the dev server told the browser that the page's entry chunk had changed. Clearing
`.next/dev` fixed it only until the next restart. `experimental.turbopackFileSystemCacheForDev: false` fixes it
for good, at the cost of a slower first compile after each start. Production builds keep their cache.

**49. One totals function for the bag, checkout and demo orders.**
`lib/commerce/totals.ts` works out subtotal, coupon discount (spread over lines in proportion to their value),
free delivery above the threshold (₹1,999, after discount), the COD fee and GST, including 18% GST inside the
delivery and COD charges. GST is taken out of GST-inclusive prices per line with the product's tax-class slab
(`lib/commerce/gst.ts`). The demo orders are built with it, so their totals are exactly what checkout would charge.

**50. Checkout is one page, for guests, and the server decides every number.**
The browser sends only contact, address, payment method and an idempotency key. `lib/orders/place.ts` rebuilds
the bag from the database, re-checks the coupon, delivery zone and COD rules, takes stock with a conditional update
inside the order's transaction (so the last pair cannot be sold twice), numbers the order from the gapless counter
(MN10001 onwards; demo orders use MND…), creates or reuses the customer record by email, and empties the bag. A
repeated submit with the same key returns the order already placed. Payment: with `RAZORPAY_KEY_ID` and
`RAZORPAY_KEY_SECRET` set, Razorpay Checkout opens and the order is confirmed only after the signature is verified on
the server; without them, "Online payment (demo)" marks the order paid at once and says so on the page. Stock is
taken when the order is placed for every method, so an abandoned Razorpay payment holds stock until staff cancel
the order (which restocks it).

**51. Bag and wishlist work without an account.**
One random cookie token per browser identifies both; only its SHA-256 is stored. The header shows the bag count
from the server; after that a small client store (useSyncExternalStore) holds the bag view returned by each server
action, so the drawer, header and buy box agree. Wishlist hearts load the saved ids once per page view.

**52. Delivery dates come from shipping zones and the PIN code.**
The first digits of a PIN code give the postal circle and so the state (`lib/commerce/india.ts`); zones match by PIN
prefix first (Kalol and Gandhinagar, next day), then state (Gujarat, 1–2 days), then the rest of India (3–6 days),
with two extra days for the North-East, Jammu and Kashmir, Ladakh and the islands. Orders before 2 pm IST on a
working day leave the same day; couriers do not deliver on Sundays. The address form still asks for the state,
which is what GST place of supply uses.

**53. Hero banners never move on their own.**
Auto-rotating carousels are hard to read and need a pause control (WCAG 2.2.2), so the hero is a swipeable row
with arrows and dots. Next.js 16 keeps the previous page mounted but hidden (React Activity) for instant back
navigation; tests therefore find form fields by role, which skips hidden elements, rather than by label.

**54. Two-factor sign-in is required for owners and managers in production only.**
They can refund payments and change settings, so on a live shop the admin holds them on My account until an
authenticator app is set up. In development the default admin account works with a password alone, so the
shop can be tried straight after `npm run seed`. `ADMIN_REQUIRE_2FA=true` or `false` overrides either default.

**55. Admin saves expire exactly the caches they affect.**
Every admin change is a server action that ends with `updateTag` for the data it touched (`lib/admin/refresh.ts`):
a product save expires the catalogue index and that product's page, a coupon save the discounts, a settings save the
settings, and so on. The next shop request reads the new data, so a change shows at once without a rebuild. The photo
upload is a route handler (it streams files and reports per-file errors), where `updateTag` is not available; it
uses `revalidateTag(tag, { expire: 0 })`, which has the same immediate effect.

**56. Uploaded photos are re-encoded on the server.**
`/api/admin/media` checks each file's bytes with sharp (not its name), turns it upright from its EXIF data, scales it
to at most 1600 px and saves it as WebP under `DATA_DIR/uploads/YYYY/MM` with a random suffix, plus a 16 px blurred
preview. `/media/…` serves those files with a one-year immutable cache, since a name is never reused. Uploading a
real photo to a product that only had a generated placeholder removes the placeholder and clears
`isPlaceholderPhoto`, so the admin's "Replace photo" warning goes away.

**57. A product goes on sale only with a photo and a price, and is archived rather than deleted once sold.**
Setting a product to Active is refused until it has at least one photo and one active size with a price. Deleting a
product that appears on an order archives it instead, so orders, invoices and reviews keep pointing at it; a product
never ordered is deleted with its sizes. Stock edits are written to the stock movement log with the staff member.

**58. Order status changes follow a fixed path, and invoices are issued on request.**
Staff can only move an order to the next sensible status (COD to confirm → Confirmed → Packed → Shipped → Out for
delivery → Delivered, with Cancelled before shipping and Returned to shop after). Cancelling or a return to the shop
puts stock back and takes the order out of the customer's total spent. Shipping asks for the courier and AWB.
The GST tax invoice is created when staff press "Create tax invoice": it takes the next gapless number for the
financial year (MN/2026-27/000001) from the same counter mechanism as order numbers, prints CGST + SGST for orders
delivered in the shop's GST state and IGST otherwise, and lists delivery and the COD fee as 18% service lines.
Demo orders use a separate DEMO/… series so removing them leaves no gap in the real one.

**59. Admin forms keep what was saved on screen.**
React resets a form after its action finishes, and a `<select>` then shows the value it was first rendered with,
so a second save could quietly undo the first (a product set to Active showed Draft again). `AdminForm` submits
from `onSubmit` inside a transition instead, which skips that reset; the `action` attribute stays for the no-JavaScript
case. Each `Field` wraps its control in its `<label>`, so a label always names its own field even when two forms on
one page share a field name.

**60. Coupons offer only what checkout enforces.**
The coupon form has percentage (with an optional cap), amount off and free delivery, a minimum order, a total usage
limit and dates in Indian time (a coupon ending on a date works until 23:59:59 IST that day). Per-customer limits,
first-order-only and prepaid-only exist in the database but checkout does not check them yet, so the admin does not
offer them rather than promise something that would not happen.

**61. The standalone build ships sharp's libvips library files.**
sharp loads libvips as a separate shared library (`libvips-42.dll` and `libvips-cpp-*.dll` on Windows, `.so` files on
Linux) at run time, which Next.js file tracing cannot see. Without them the standalone server fell back to sharp's
WebAssembly build, which needs a package that is not installed, so photo uploads failed in production while working in
development. `outputFileTracingIncludes` adds `node_modules/@img/sharp-*/lib/**` to every route, and the `/media` file
route no longer imports the upload code, so serving a photo never loads sharp.

**62. Wide admin tables scroll inside their box on phones.**
The admin's grids give their single phone column `minmax(0, 1fr)` (an implicit grid column grows to its widest content),
and every scrolling table wrapper is `position: relative`: the visually hidden labels and captions inside tables are
absolutely positioned, and without a positioned ancestor they escaped the scroll box and made the whole page scroll
sideways. An end-to-end test checks the admin pages at 390 px.

**63. The coupon field is not a form.**
It appears in the bag and inside the checkout form, and forms cannot be nested: the browser drops the inner form while
parsing (a hydration error) and Enter in the coupon field would have submitted the order. The field is an input and a
button; Enter applies the code. An end-to-end test applies a coupon with Enter at checkout.

## Accounts, admin roles and the Bone/Espresso/Oxblood redesign (brief of 1 Nov 2026)

**64. Customer accounts use email and password, and the password is saved only after the emailed code is checked.**
The owner asked for sign-up with name, email, mobile and password, email verification, and forgot/reset password.
This replaces the passwordless design of decision 2 for customers (staff were already on passwords). Signing in
with only an emailed code, Google or an SMS code still works, and guest checkout stays the default.
Better Auth's own sign-up saves the account and password first and verifies the email afterwards. That lets anyone
pre-register someone else's email with a password of their choosing; if the real owner later confirms the address,
that password still works. So Better Auth's sign-up endpoint is switched off (`disableSignUp`), and the shop's
sign-up is two server actions (`lib/actions/account.ts`): the first checks the form and emails a code, the second
checks the code through Better Auth and saves the account, the Argon2id password hash, name and +91 mobile in the
same request. Nothing is stored for an email nobody has proved. Because a guest checkout already created a customer
record, the second step reuses that record, so a guest who signs up later finds their earlier orders in the account.
Rules for passwords (8 to 128 characters, not a common password, not the email's name part), names and Indian
mobiles live in `lib/auth/customer-rules.ts`, shared by the forms and the server and covered by unit tests.
Password reset is an emailed code plus the new password (Better Auth's email OTP reset), followed by signing in; it
also gives a guest or a code-only customer their first password. Sessions last 30 days; with "Keep me signed in"
off, the session cookie ends when the browser closes.

**65. The app sends account codes itself and waits for the email.**
Better Auth runs its email callbacks as background tasks and swallows their errors, so a failed send still answered
"code sent" and the shopper waited for an email that never came. The shop's forms now ask a server action for a code:
it creates the code with Better Auth's server-only `createVerificationOTP`, replaces any earlier code for the same
email and purpose, sends the email and waits. A failure says "We could not send the email just now" and lifts the
one-minute wait. Codes are 6 digits, valid 10 minutes, 5 tries. One code per email per minute and kind of code
(sign-in and sign-up share one kind; resets have their own), checked on the server and counted down on screen;
15 code requests per minute per IP. Password sign-in also allows 10 tries per email per 15 minutes, on top of the
generous per-IP limits of decision 26. The cost: a reset request for an unknown email returns without sending, so it
is slightly faster than one for a known email. The reply text is identical, and reliability of real emails matters
more for a small shop than that timing difference. Without SMTP settings, development writes every email to
`DATA_DIR/outbox` and prints the file path in the terminal (decision 33).

**66. Checkout knows the signed-in customer.**
A signed-in shopper's order belongs to their account whatever email they type, and checkout fills in their name,
email, mobile and last delivery address. Guests see "Have an account? Sign in to fill in your details". The account
page lists the customer's orders (unpaid online orders excepted) with status and a link to the order page. The header
shows "Sign in" or "Your account" (with a small dot); it already reads cookies on every request, so the signed-in
state is never cached (decision 23).

**67. Customer and staff rate limits are counted separately.**
Customers and staff are two Better Auth instances (decision 2) that share the `RateLimit` table. Better Auth keys a
limit by IP and path, and the path is relative to each instance's base, so both counted `/sign-in/email` in one
bucket. Once customers had passwords, their sign-ins used up the strict staff limit (10 per 15 minutes) and the shop's
staff could not sign in; the end-to-end tests found it. Both instances now use a custom rate-limit storage on the same
table that prefixes the key with `customer:` or `staff:` (`lib/security/rate-limit.ts`). The shop's own limits
were already namespaced (`login:`, `code-send:`, `newsletter:` and so on).

**68. Three staff roles: Owner, Manager, Staff.**
The five roles of the first build (Owner, Manager, Catalogue editor, Order staff, Viewer) are now the three the owner
asked for. Every page, server action and route asks one table, `lib/auth/permissions.ts`, through `requireStaff`;
the menu hides what a role cannot open, but the server check is the protection (the end-to-end tests open the
addresses directly and post to the upload endpoint without the page).
- *Owner*: everything, and the only role with settings, staff accounts, the activity log and removing demo data.
  Payment keys (Razorpay) live in the server's `.env`, not in the admin, so only whoever runs the server changes
  them; the `settings.payments` permission is reserved for the owner if a payments screen is added.
- *Manager*: products, categories, brands, photos, orders, coupons, banners and customers (with notes). No settings
  and no staff.
- *Staff*: views and moves orders on (status, courier and AWB, notes, tax invoice); sees products and stock read-only.
  Deletes nothing, changes no settings.
The migration turns existing Catalogue editors and Order staff into Staff, the safe side: an owner promotes anyone who
needs more. Two-factor stays required for Owner and Manager in production (decision 54).

**69. An activity log records every admin change.**
`lib/admin/audit.ts` writes one `AuditLog` row after each successful change: who, what (a sentence such as "Changed
coupon WELCOME10"), which record, when, from which IP and browser, and before/after values for the fields that
changed. Settings, coupons, brands, categories, product details, prices and stock log their field changes; money is
shown in rupees on the page. Long text (descriptions) is logged as "changed", not copied twice. A form saved without
edits logs nothing. Password changes, invites, role changes, switching accounts off and the recovery command are
logged too; secrets never are. Owners read it at Admin → Activity, filtered by person and area. It is kept for as long
as the shop runs: a small shop writes a few hundred rows a month, which SQLite holds without effort.

**70. Staff choose their own passwords, and the shop can always get back in.**
The owner invites staff by email with a role. The invite is a one-time link valid for 3 days to `/admin/set-password`;
a staff member who forgot their password gets the same kind of link, valid 1 hour, from "Forgot your password?" on the
staff sign-in. Links are stored the way Better Auth's `/reset-password` endpoint expects, so that endpoint sets the
password (12 characters at least, common ones refused), creates the login for a new invite and signs the person out
elsewhere. The app sends these emails itself and waits for them (decision 65); a failed invite says so and offers
"Send invite again". The forgot-password reply is the same whether or not the email is a staff account.
Guard rails so the shop cannot lock itself out: nobody changes their own role or switches themselves off, and the last
owner who can sign in can be neither demoted nor switched off. Switching an account off ends its sessions at once and
voids its links; its next sign-in says the account is off. An owner can reset another person's two-factor (lost phone).
If the owner is locked out (lost phone and backup codes, forgotten password), `npm run admin:recover -- <email>
[--password "<new>"]` on the server removes two-factor, switches the account on, ends its sessions, clears the staff
sign-in counters and optionally sets a password, and logs that it did. Access to the server is the proof of ownership.
In development the staff sign-in page lists the owner accounts and points to that command.

**71. Admin feedback: toasts for saves, inline messages for problems.**
A successful save shows a short toast in the corner (it fades after 5 seconds); errors stay next to the fields they
are about. Where there is no toast area (the staff sign-in pages), forms answer inline. Loading shows a skeleton inside
the admin frame, a failed page shows "This page did not load" with a reference and Try again, and an unknown admin
address or deleted record gets the admin's own 404 instead of the shop's. Because the skeleton streams first, a
role redirect on a forbidden page now happens in the browser a moment after the response starts, instead of as a 307;
the signed-out redirect still comes from `proxy.ts` with a real 307. An order without a tax invoice shows "No tax
invoice yet" with the option to issue it, instead of a 404.
Two fixes found while testing every admin feature: order status changes, order notes and customer notes did not
refresh the page they were made on (it kept the old status and notes until reloaded), so those actions now call
`refresh()`; and the toast is raised as the server's answer arrives rather than from an effect, because a save can
remove its own form (a cancelled order has no next status) and the confirmation must still show.

**72. Bone, Espresso, Oxblood (60-30-10) replaces Graphite, Navy and Brass (supersedes 44's palette).**
The owner gave exact values, all used as given in `lib/design/tokens.ts`. Bone `#F5F1EA` page, Paper `#FBF9F5` cards
(`raised`), Linen `#EDE7DD` bands, inputs and photo tiles (`surface`; the brief's "surface-alt"), espresso text,
walnut secondary text, oxblood for the one filled button per view, sale prices, badges and active states; the warm
dark theme likewise. Where the brief and "everything passes AA in both themes" could not both hold, AA won and the
brief's colours kept their roles:
- *Status in dark mode.* Success `#2F6B4F`, warning `#9A6A12` and error `#B42318` are 2.3–3.9:1 on the dark
  backgrounds, so dark mode uses lighter tints of the same hues (`#74B592`, `#D9A84F`, `#F08F7C`, error leaning
  orange so it never reads as oxblood). Light mode uses the exact values.
- *Warning text.* `#9A6A12` is 3.8–4.5:1 on Bone and Linen: fine for an icon, not for words. Low stock, demo data and
  placeholder notices show an amber icon with espresso words.
- *Oxblood text in dark mode* (`#D2676D`) is 4.3:1 on the dark Linen band, so sale prices sit on the page or a card,
  never on a band (the contrast table only allows those pairs, and an on-page audit of every text run found none).
- *The espresso frame.* Header, footer and admin sidebar are Espresso (the brief's "header, footer background"), via
  a `.chrome` class that redefines the semantic tokens inside it; menus and drawers that open from it carry
  `chrome-exit`. Oxblood text is 4.3:1 on espresso, so in the frame oxblood only underlines ("Sale", link hovers)
  and marks the current admin page; the words stay bone.
- *Button edge.* The dark oxblood fill is 2.3:1 against the dark page. A button is identified by its label, so the
  old "button edge" pair was dropped rather than the brief's colour.
One oxblood fill per view: other buttons are espresso outline (`secondary`) or text buttons. Admin forms are outline
unless marked as the page's main action; "Buy now" and "Notify me" are outline beside oxblood "Add to bag"; a chosen
size is an oxblood outline; the newsletter button sits in bone on the espresso footer; the floating WhatsApp button is
espresso. Links are espresso, underlined, oxblood on hover. Product photos sit on Linen (light) or `#201B18` (dark);
the demo photos are cut-outs, so photos are multiplied into the tile in light mode only, and the blur previews and
placeholder drawings are transparent so either tile shows through. No pure black or white anywhere (a unit test checks).

**73. Readable headings, and no text over photos (owner's report, 1 Nov 2026).**
The owner found headings hard to read and the "Watches for him / her" tiles unreadable on a phone.
- *Headings.* Bodoni Moda chooses its optical size from the font size, so every heading used its poster cut:
  hairline strokes and loose letter spacing. The headings now pin its text cut (`"opsz" 11`, set once on the
  `font-display` token) at weight 500: the same Bodoni letters with strokes that hold up on a phone screen.
- *Collection tiles.* The photo filled the tile and the heading was drawn across it. Words and photo now sit in two
  columns, in full espresso rather than the walnut used for small captions on photos.
- *Header at 1024–1279 px.* Logo, six menu items and five icons need about 1,160 px, so every page scrolled sideways
  on small laptops and landscape tablets. The full menu bar now starts at 1280 px; narrower screens use the menu
  button, which fits whatever categories the owner adds.
A layout check (scratch script, run before each report) loads 26 pages at 390, 768, 1024 and 1440 px and fails on
text over a photo, sideways scrolling, clipped text or text under 12 px; a second check measures every visible text
run against its real background in both themes.

**74. Nothing that reads as a template (Phase 4 of the 1 Nov brief).**
The brief bans the marks of generated sites; a unit test (`tests/unit/design-rules.test.ts`) now fails on any of them
in `app/` or `components/`, so they cannot creep back.
- *Body type is Instrument Sans* (replaces Hanken Grotesk from the original brief and 45; the new brief allows
  Instrument Sans or DM Sans). Instrument Sans is a slightly narrow grotesque with a tailored feel that sits well
  beside Bodoni; DM Sans is rounder and more geometric. Same loading as before: not preloaded, swapped in from a
  size-matched fallback.
- *Serif with restraint.* Bodoni stays for the logo, the hero, page titles, the home collection tiles, Journal titles
  and store section headings, at one size per level (section headings are all 24/30 px). It is not used inside
  tasks: forms, the emailed-code step, checkout steps, product details and the admin are all sans.
- *Corners* are 2 px (buttons, inputs, badges), 4 px (cards, photos) and 6 px (dialogs, sheets); before they were
  4/8/12. `rounded-full` is kept only for things that are round: colour swatches, count badges, status dots and
  meters. The WhatsApp button, carousel and gallery arrows, wishlist heart and the order-confirmed tick lost their
  circles.
- *Hairlines, not boxes.* Store sections open with a full-width hairline and the heading (`SectionHeading`), brands
  are a plain stockist row instead of pill boxes, home reviews are three columns divided by hairlines instead of
  cards, and the hero shows "01 / 03" between square arrows on a hairline instead of dots.
- *Shadows.* One small shadow (`shadow-overlay`, 8/24 px, espresso-tinted) for what floats above the page: menus,
  drawers, the sticky buy bar, toasts and the WhatsApp button. The unused card shadow is gone. No gradients, glass,
  blur, glow or emoji anywhere (there were none; the test keeps it that way).
- *Motion* is 150–250 ms: photo hovers went from 300 ms and 5 % zoom to 200 ms and 3 %, the WhatsApp button fades
  rather than grows. Looping animation is only the admin's loading placeholder, behind `motion-safe`. Scrolls started
  from code (the hero arrows, jumping to the size picker) ignored the reduced-motion setting, because the CSS rule
  cannot reach `scrollTo({ behavior: "smooth" })`; they now ask `scrollBehavior()` (`lib/design/motion.ts`).
- *Copy.* The demo reviews were DummyJSON filler ("Highly impressed!", "Waste of money!") under American names. The
  ratings and dates stay; the text is now written per kind of product and per rating (fit, size, how long a scent
  lasts, what came in the box) and never promises anything about the shop's own service, under first names with an
  initial (`prisma/demo/reviews.ts`). Lines are picked so no two products share their first five-star review or
  reviewer, which the home page shows side by side. "Shop now" on the watch tiles became the real count ("See all 6 watches"). Unused
  hero strings from the old hand-drawn underline were removed with the underline itself.
- *Small fixes found on the way.* Three non-interactive things changed colour on hover (home trust icons, an admin
  checklist icon, the admin "info" badge), and counts of one read "1 stars" and could read "1 products".

**75. Search engines, link previews and the last layout gaps (Phase 5 of the 1 Nov brief).**
- *Sitemap.* `/sitemap.xml` lists every live page that is not marked "hide from search": home, categories, products
  (with up to four photos each), brands that have active products, collections at their landing address, sale,
  Journal posts, policies, about, FAQ and contact. Built per request from cached data, like the pages, so the build
  still needs no database. The first version listed three brand pages that 404 (brands with no active products) and
  a collection that redirects; it now uses the pages' own rules, and an end-to-end test requests every address in
  the sitemap and fails on anything but 200. robots.txt names the sitemap and reads the site address at request time.
- *Structured data (JSON-LD).* Store and WebSite on the home page (address details still in [brackets] are left out,
  not published), Product with price in rupees, stock, rating and up to five reviews on product pages, BreadcrumbList
  wherever breadcrumbs show, FAQPage wherever questions and answers show, BlogPosting on Journal posts. Built by pure
  functions in `lib/seo/structured-data.ts` (unit-tested) and written with "<" escaped, so no product name or review
  can close the script tag.
- *Link previews.* Product pages share their own photos, Journal posts their cover (type "article"), and every other
  page a default card (`public/og.png`, 1200 × 630, rendered from the colour tokens by `npm run tokens`). A file-based
  `opengraph-image` was not used because Next gives it priority over the photos a product page sets. Pages that set no
  title of their own fall back to their `<title>`. `og.png` and `sitemap.xml` were added to the proxy's list of root
  files, which would otherwise have answered 404; the routing test now checks `public/` as well as `app/`.
- *HIDE_FROM_SEARCH=true* blocks every crawler in robots.txt and marks every page noindex, for demo and test copies
  (the Vercel demo, 76). The real shop leaves it out.
- *Layout.* Product pages use two columns from 768 px (tablets showed a full screen of photo before the name and
  price); the sticky phone buy bar stopped hiding when the page jumped straight back to the top (it only watched the
  screen's bottom edge) and now has an end-to-end test; long category, collection and brand introductions show three
  lines and "Read more" on phones so products start on the first screen; the admin product filters fold behind
  "More filters" on phones. Lighthouse budgets now cover a category and a product page too (performance 90).
- *Performance.* Measured on this laptop, standard Lighthouse (mobile, simulated) gave the category and product
  pages 86–88 with the CPU at full speed and 63–73 when it slowed down on battery (its benchmark swings 650–1,850,
  so local scores are not comparable run to run). With real throttling and no CPU slowdown they score 98–99
  (largest paint 1.9 s, blocking time under 100 ms); with the 4x CPU slowdown that stands in for a low-end phone,
  50–67. The traces showed why the simulated score is low: the browser finished loading by 0.4 s but first painted
  at 0.6 s, after React had hydrated the page in small slices, and Lighthouse's model then charges every script to
  the first paint. Part of that hydration was a second copy of the whole category tree in the phone menu, on every
  page; the menu now renders its contents when first opened (a `<dialog>` cannot open without JavaScript, and the
  desktop menu keeps every category link in the HTML for search engines). The deciding numbers are PageSpeed
  Insights on the deployed site and the Lighthouse step in GitHub Actions, which run on steady hardware.

**76. A demo copy on Vercel, kept apart from the real shop's set-up.**
The owner asked for a demo on Vercel. Vercel runs the app as serverless functions with no lasting disk, while the
shop is built around one SQLite file on Hostinger (21–22), so the demo works differently and only when the build runs
on Vercel (`VERCEL=1`); the Hostinger build is unchanged.
- `vercel.json` runs `scripts/vercel-build.mjs`: it seeds the demo catalogue into `demo-seed/mn.db` (offline copy,
  production rules, so the owner password must be set), folds the write-ahead log into that one file, then runs
  `next build`, which ships the file with the server code.
- At runtime `DATA_DIR=/tmp/mn-data` and `DATA_SEED_DIR=demo-seed`: each new server instance copies the prepared
  database into `/tmp` before first use (`lib/db/paths.ts`). The search index and page cache rebuild themselves.
  The SQLite page-cache handler is off on Vercel (instances share no disk), so each instance keeps its own cache.
- What that means for the demo: orders, sign-ups, admin edits and uploaded photos last only as long as the instance
  (minutes to hours) and are not shared between instances; every new instance starts again from the demo data.
  Emails are not sent (`EMAIL_TRANSPORT=outbox`), so customer sign-up codes cannot arrive; guest checkout works.
  Two-factor sign-in for the admin is off, because a set-up would vanish with the instance. `HIDE_FROM_SEARCH=true`
  keeps the copy, with its real brand names and placeholder address, out of search engines.
