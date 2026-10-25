# MN Shoes & Watches — master brief (Parts 1–7)

Source: master prompt by Vraj Patel, 25 Oct 2026, saved here verbatim so every build phase works from the same spec.
Placeholders in square brackets are still open, except the city: the store is in **Kalol, Gandhinagar district, Gujarat** (owner, 25 Oct 2026).
Other store details (phone, WhatsApp, GSTIN, domain) will be provided later.

Owner changes since the brief (these override the text below):
- Database: **SQLite** instead of MySQL/MariaDB, to run on Hostinger's Business ("Unlimited") web hosting plan (25 Oct 2026). See DECISIONS.md 21–22.
- **No brands**: categories only (25 Oct 2026). No brand pages, brand menu item, brand filter, brand strip or brand field on products. Wherever the text below mentions brands, it no longer applies. See DECISIONS.md 36.

---

## Part 1 — Role, project brief and catalogue

You are a senior full-stack engineer and a senior product designer who has shipped large e-commerce stores. Build a complete, production-ready e-commerce platform for a real retail business. Write real, working code only: no placeholder functions, no "TODO: implement", no lorem ipsum, no fake reviews. When a decision is unclear, choose the option a top Indian or global retailer would choose, write it in DECISIONS.md, and keep going.

### Business

- Store name: [MN Shoes & Watches]. Domain: [mnshoes.in]. City: [City, Gujarat, India]. Phone and WhatsApp: [+91 XXXXX XXXXX]. GSTIN: [GSTIN].
- Sells: men's shoes in every category, watches for men and women, perfumes, and accessories.
- Market: India first. Currency INR (₹), prices shown GST-inclusive, Indian address format with PIN code, sizes in UK/India.
- Goal: a fast, trustworthy store that ranks well on Google and in AI answers, and that the owner runs alone from an admin panel without a developer.
- Brand feeling: confident, premium but approachable. Think a well-run local shop that has grown up, not a discount bazaar and not a cold luxury house.

### Catalogue structure (seed data, fully editable in admin)

Categories are a tree the owner can change. Seed it with:

- Men's Shoes: Formal (Oxfords, Derbys, Brogues, Loafers, Monk Straps); Casual (Sneakers, Slip-ons, Boat Shoes, Loafers); Sports (Running, Training, Walking); Boots (Chelsea, Chukka, Desert); Ethnic (Mojaris, Kolhapuris); Sandals, Slides and Flip-flops.
- Watches: Men and Women, each with Analog, Chronograph, Automatic, Digital, Smartwatches, Premium; plus Couple Sets.
- Perfumes: Men, Women, Unisex; Eau de Parfum, Eau de Toilette, Attar, Deodorants and Body Mists, Gift Sets.
- Accessories: Belts, Wallets, Sunglasses, Socks, Shoe Care, Watch Straps, Gift Boxes.

Each category type has its own filterable attributes, defined in admin as attribute templates:

| Type | Attributes |
|---|---|
| Shoes | Size (UK 5–12, half sizes optional), width, colour, upper material, sole material, closure, occasion, heel height |
| Watches | Gender, dial size (mm), dial colour, case material, strap material and colour, movement, display, water resistance (m), warranty (months) |
| Perfumes | Volume (ml), concentration, gender, top / heart / base notes, longevity, occasion |
| Accessories | Material, colour, size, gender |

Products support variants (size × colour), each variant with its own SKU, price, compare-at price, stock, barcode/GTIN and images. Brands are their own entity with a logo, description and SEO page.

## Part 2 — Tech stack and architecture

Build one Next.js application that holds the storefront, the admin panel and the Node.js backend together. One app means one deploy on a Node.js hosting plan, with no separate Express server to keep alive.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (latest patched 16.x), App Router, TypeScript strict, React 19 | Server rendering for SEO, built-in image and metadata tools |
| Backend | Next.js Route Handlers and Server Actions on the Node.js runtime | Node.js backend inside the same app |
| Database | MySQL 8 / MariaDB through Prisma ORM | Every cPanel/Hostinger plan includes MySQL; switching Prisma to PostgreSQL later is one line |
| Auth | Better Auth or Auth.js v5 | Customers: email OTP, Google, optional phone OTP (MSG91). Admin: email + password + TOTP two-factor |
| Styling | Tailwind CSS v4 with custom design tokens; Radix primitives for menus, dialogs, tabs | Accessible behaviour without the default component-library look |
| Forms and validation | React Hook Form + Zod, the same Zod schemas on server and client | One source of truth for rules |
| Cart state | Server-side cart in the database, keyed by a signed cookie; Zustand only for UI state | Cart survives devices and login |
| Search | MySQL FULLTEXT with synonyms table at launch; adapter ready for Meilisearch | Works on shared hosting, upgrade path later |
| Media storage | Storage adapter: local /uploads folder by default, S3-compatible (Cloudflare R2 or Bunny) by env switch | Starts on the hosting disk, moves to a CDN without code changes |
| Images | next/image with sharp, AVIF and WebP, responsive sizes, blur placeholders | Core Web Vitals |
| Video | Direct MP4/WebM upload (max 50 MB, poster image required) or a YouTube/Vimeo/Bunny Stream URL | Shared hosts cannot transcode; streaming services can |
| Rich text | Tiptap editor in admin, stored as JSON, rendered to clean semantic HTML | Owner writes descriptions and blogs safely |
| Email | Nodemailer over the host's SMTP, with React Email templates; Resend as an option | Order mails without extra cost |
| Payments | Razorpay (UPI, cards, netbanking, wallets) + Cash on Delivery; payment adapter interface so Cashfree or PhonePe can be added | Indian payment habits |
| Shipping | Shiprocket API adapter (rates, AWB, tracking) + manual mode | Real delivery dates in cart |
| Caching | Next.js Cache Components with tagged caching; admin saves call revalidateTag / updateTag | Pages are static-fast but update the moment the owner edits |
| Analytics | GA4, Google Search Console, Meta Pixel, all loaded after consent and after page interaction | Tracking without hurting speed |

### Architecture rules

- Folder layout: app/(store), app/admin, app/api, components/store, components/admin, lib (db, auth, payments, shipping, storage, seo), prisma, emails, scripts.
- Every product, category, brand and blog page is a Server Component that renders full HTML: title, price, stock, description, breadcrumbs and JSON-LD must be in the first HTML response, never injected by client JavaScript.
- Client components only where interaction needs them (gallery, variant picker, cart drawer, filters). Keep client JavaScript on a product page under 120 KB gzipped.
- All money is stored as integer paise. All times stored in UTC, shown in IST.
- All admin mutations go through Server Actions with role checks and Zod validation, and write an audit log row.
- Seed script creates the category tree, attribute templates, 3 sample brands, 12 sample products with real-looking specs, and an owner account from env variables.

## Part 3 — Design system

The store uses exactly three colour families, each with a full shade scale: warm Ink neutrals, Cognac (leather) as the brand accent, and Bottle Green for trust and success. Define them once as CSS variables in Tailwind v4 @theme and never hard-code a colour anywhere else.

### Colour palette

| Shade | Ink (neutral, ~85% of the page) | Cognac (brand accent, ~10%) | Bottle Green (trust, ~5%) |
|---|---|---|---|
| 50 | #F8F6F2 (page background) | #FBF4EC | #EEF5F1 |
| 100 | #F1EDE7 | #F7E8DA | #D6E8DE |
| 200 | #E3DDD6 (borders) | #EED0B4 | #ADD1BE |
| 300 | #C9C1BA | #DFAA7E | #7FB59A |
| 400 | #A39A93 | #CC8550 | #4F9475 |
| 500 | #7A706A (muted text) | #B5652E | #2F7558 |
| 600 | #5F5650 | #9A4F24 (accent text, links) | #245D46 |
| 700 | #463E38 | #7A3E1D | #1F4D3A (in-stock, success) |
| 800 | #2E2824 | #5E3017 | #183B2D |
| 900 | #1F1A17 (body text, primary buttons) | #432211 | #112A20 |
| 950 | #14110F (dark-mode background) | #2A150A | #0A1A14 |

Usage rules:

- Primary button ("Add to bag", "Pay now"): Ink 900 background, Ink 50 text. Black buttons read as premium for shoes and watches.
- Cognac is for emphasis only: sale price, active filter chips, link hover, the "New" badge, one highlight band on the homepage. Never a full-page background.
- Bottle Green is only for in-stock, delivery-date, verified-buyer and success states.
- One exception outside the three families: error red #B42318, used only for form errors and destructive admin buttons, because users must recognise errors instantly.
- Small text must pass WCAG AA (4.5:1). Cognac 500 fails on the light background, so accent text uses Cognac 600 or darker.
- Dark mode follows the phone's setting with a manual toggle: Ink 950 background, Ink 100 text, Cognac 400 accent, Green 400 success.

### Typography

- Display font: Bodoni Moda (headings, hero, price on product page), loaded with next/font. It gives a fashion-editorial feel that suits watches.
- Body and UI font: Hanken Grotesk. Do not use Inter, Poppins, Plus Jakarta Sans or Space Grotesk.
- Prices and specs use tabular figures. Body text 16 px minimum, line height 1.6, line length 60–75 characters.
- Type scale (px): 12, 14, 16, 18, 20, 24, 30, 38, 48, 60. Sentence case for every heading and button.

### Shape, spacing and motion

- 4 px spacing grid. Corner radius 4 px on buttons and inputs, 8 px on cards and images at most. No pill-shaped everything.
- Separate with thin Ink 200 borders and whitespace, not heavy shadows.
- Motion 150–250 ms, ease-out, only where it explains something: image zoom, cart drawer, add-to-bag confirmation, filter changes. Respect prefers-reduced-motion.
- One icon set only (Phosphor, light weight, 1.5 px stroke look). No emoji anywhere in the UI.

### Rules so the site does not look AI-generated

- No gradients on buttons or text, no glassmorphism, no glowing blobs, no purple or blue tech colours.
- No homepage built from rows of three identical cards with an icon in a circle.
- Use an editorial, asymmetric grid: a large lifestyle image beside a small text block, a full-width product row, a split section. Left-align body text; centre only short headings.
- Real product and lifestyle photography from the owner, shot on consistent backgrounds. Where an image is missing, show a plain Ink 100 tile with the product name, never a stock photo.
- Banned copy words: elevate, unleash, seamless, revolutionise, game-changer, "discover the perfect", "Welcome to our store". Write short, specific lines: "Leather Derbys, resoleable, sizes UK 6–11."
- Trust numbers (years in business, orders delivered, store address) come from admin settings. Never invent them.
- No fake urgency: no countdown timers that reset, no "23 people are viewing this". Show real low-stock only when stock is 5 or fewer.
- Small human details: a hand-drawn underline on one homepage word, the owner's signature on the About page, real store photos on Contact.

## Part 4 — Storefront pages and UX

Design every page for a 390 px phone first, then scale up to tablet and desktop. Every page must work with keyboard only and meet WCAG 2.2 AA, with touch targets of at least 44 × 44 px.

### Global elements

- Announcement bar: one admin-editable line (for example free shipping threshold), dismissible.
- Header: logo, mega menu (Men's Shoes, Watches, Perfumes, Accessories, Brands, Sale) with category images in the dropdown, search, account, wishlist, bag with item count. Header shrinks on scroll.
- Search: instant suggestions after 2 characters showing products with thumbnails and prices, matching categories and brands, recent searches, and typo tolerance through a synonyms table ("sneker" → sneakers, "chronograph" ↔ "chrono").
- Mobile: menu drawer with large tap rows, full-screen search, sticky "Add to bag" bar on product pages. A small WhatsApp button that never covers a buy button.
- Footer: store name, full address, phone, opening hours, map link, policy links, payment icons, newsletter signup, social links.

### Pages

1. Home: admin-managed hero (image or muted looping video, separate mobile crop); shop-by-category tiles; New arrivals; Bestsellers; a split "Watches for him / Watches for her" section; brand strip; one editorial lookbook block; real customer reviews; "Visit our store" block with photo and map; trust bar (COD, free shipping above ₹[X], [7]-day easy exchange, warranty on watches); latest journal posts. Every block can be turned on, off and reordered from admin.
2. Category page: breadcrumbs, H1, a 60–120 word intro written by the owner, filters (side panel on desktop, bottom sheet on mobile) with result counts, sort (relevance, newest, price, bestselling), product grid, crawlable pagination (?page=2 links plus a "Load more" button), then category FAQ and buying guide text below the grid.
3. Product card: second image on hover (desktop), brand, name, price, compare-at price with % off, colour swatches, rating with count, "Only 3 left" when stock ≤ 5, wishlist heart. Desktop quick-add shows sizes.
4. Product page: gallery with pinch and hover zoom, product video, optional 360° spin; brand, name, rating, price "incl. all taxes", EMI note for prices above ₹3,000; variant pickers with out-of-stock sizes struck through; size guide modal (UK/EU/US chart plus how to measure your foot); PIN code check showing delivery date and COD availability; "Add to bag" and "Buy now"; offers; key specs table; description; care and warranty; returns summary; reviews with photos and verified-buyer tag; customer Q&A; "Complete the look"; similar products; recently viewed.
   - Watches also show a dial-size visual on a wrist outline, movement, water resistance in plain words ("30 m = splash-proof, not for swimming").
   - Perfumes also show a notes pyramid (top, heart, base) and longevity.
5. Search results: same layout as a category page, with "Did you mean" and zero-result suggestions.
6. Cart: slide-in drawer plus full page. Shows delivery date, shipping cost, free-shipping progress bar, collapsed coupon field, "Prices include GST", and saved-for-later.
7. Checkout: one page, guest by default. Mobile number first, then email, address with PIN code that auto-fills city and state, delivery option, payment (UPI first, then cards, netbanking, wallets, COD with any COD fee shown up front). Seven to eight input fields total. Sticky order summary. Offer one-tap account creation only after payment.
8. Order confirmation and tracking: order details, expected delivery, WhatsApp/email updates; public tracking page by order number + phone.
9. Account: orders, returns and size exchanges, addresses, wishlist, profile, saved payment methods via Razorpay tokens.
10. Content pages: brand pages, Sale, gift guides, Journal (blog), About, Contact with map, Store locator, FAQ, and policies (shipping, returns and exchanges, warranty, privacy, terms), all editable in admin.
11. 404: search box, popular categories and bestsellers.

Keep the code ready for Hindi and Gujarati translations (all UI strings in message files), but launch in English.

## Part 5 — Admin panel (owner dashboard)

The admin at /admin must feel like a polished SaaS product: the owner manages everything without touching code. It uses the same three-colour design tokens, works on a phone for order handling, and has a Ctrl+K command palette, autosaved drafts and an unsaved-changes warning.

Build it single-store, but put a storeId column on every business table (defaulting to one store) so it can become a multi-store SaaS later without a painful migration.

### Modules

- Dashboard: today and 30-day sales, orders, average order value, a 30-day sales line chart, pending orders, low-stock alerts, top products, abandoned carts.
- Products: searchable list with filters, bulk edit (price, stock, status, category), CSV import and export. Product editor with:
  - Title, auto slug (editable, with redirect created when changed), brand, multiple categories, attribute template.
  - Variant generator: pick sizes and colours, get a matrix; each variant has SKU, price, compare-at price, stock, GTIN/barcode, weight.
  - Images: drag-and-drop upload, reorder, crop, alt text required before publishing, images assignable per colour. Auto-convert to WebP/AVIF, reject files over 10 MB.
  - Videos: upload MP4/WebM up to 50 MB or paste a YouTube/Vimeo/Bunny URL; poster image required.
  - Rich description (Tiptap), highlights, key specs, care, warranty, tags, related products.
  - SEO panel: meta title (60-character counter), meta description (155), live Google snippet preview, OG image, canonical, noindex toggle, product FAQ entries.
  - Status: draft, active, scheduled, archived. Duplicate product button.
- Categories: drag-and-drop tree, image, banner, intro text, FAQ, SEO fields, which filters appear.
- Brands, collections and attribute templates: manual collections or rule-based ones ("Watches under ₹5,000", "Leather formal shoes").
- Inventory: stock per variant, low-stock threshold, stock movement history.
- Orders: list and filters, status timeline, GST invoice PDF, packing slip, create Shiprocket shipment and AWB, refund through Razorpay, internal notes, COD confirmation over WhatsApp.
- Returns and exchanges: approve, reject, size exchange creating a new order.
- Customers: profiles, order history, notes, simple segments (repeat buyers, high value, inactive 90 days).
- Discounts: coupon codes (percent, flat, free shipping), minimum order, usage limits, start and end dates, product or category scope, automatic discounts, buy-X-get-Y.
- Reviews: moderate, reply publicly, automatic review request email 5 days after delivery.
- Content: homepage section builder (toggle and reorder blocks), banners, pages, Journal with author profiles, navigation menu editor, announcement bar, policy pages.
- SEO tools: 301 redirect manager, sitemap status, reports for missing alt text, missing meta, thin category intros, broken internal links, Google Merchant Center feed URL.
- Media library: all uploads, search, where each file is used, safe delete.
- Settings: store details (name, address, phone, hours), GST, shipping zones and rates, free-shipping threshold, COD fee and PIN code rules, payment and shipping API keys (encrypted at rest), email templates, analytics IDs, social links, logo and favicon. Brand colours are locked to the palette.
- Staff and roles: Owner, Manager, Catalogue Editor, Order Staff, each with fixed permissions; two-factor login required for Owner and Manager; full activity log.

## Part 6 — SEO, AI-search readiness and performance

Treat SEO as part of the build, not an add-on: every page must be readable by Google, by Google's Shopping Graph and by AI assistants straight from the first HTML response.

### URLs and indexing

- Categories: /mens-shoes/formal/oxfords, /watches/women/automatic. Products: /product/[slug] (one URL per product, independent of category, so there are no duplicates). Brands: /brands/[slug]. Journal: /journal/[slug].
- Attribute landing pages only where people search for them (for example /watches/men/under-5000, /mens-shoes/white-sneakers), created from admin collections with their own intro text.
- Sort, view and tracking parameters canonicalise to the clean URL. Paginated pages are self-canonical. Other filter combinations are noindex, follow.
- robots.txt blocks /admin, /api, /cart, /checkout, /account and internal search results. Allow Googlebot, Bingbot and AI search crawlers (OAI-SearchBot, PerplexityBot) so products can appear in AI answers; make this list editable in settings.
- Segmented XML sitemaps (products, categories, brands, journal, images, videos) with accurate lastmod that changes only when content changes.
- Out-of-stock products stay live with OutOfStock availability, a "Notify me" form and alternatives. Discontinued products get a 301 to the closest replacement.
- `<html lang="en-IN">`.

### Metadata

- generateMetadata on every route. Owner-written titles and descriptions win; otherwise use templates, for example "[Brand] [Product] – [Colour] | [MN Shoes & Watches]" and a description that includes price, key spec and delivery promise.
- Open Graph and Twitter cards with a 1200 × 630 image generated per product (opengraph-image) when none is uploaded.

### Structured data (JSON-LD, server-rendered)

- Organization and a ShoeStore/LocalBusiness entity with address, geo, opening hours, phone and sameAs social links; WebSite with SearchAction.
- ProductGroup with hasVariant for size/colour variants; each Product with name, images, description, SKU, GTIN, brand, colour, size, material.
- Offer with price, priceCurrency INR, availability, itemCondition, seller, MerchantReturnPolicy and OfferShippingDetails.
- AggregateRating and Review only from real on-site reviews.
- BreadcrumbList on every product, category and article; ItemList on category pages; VideoObject for product videos; FAQPage where there is a real FAQ; Article with a Person author on journal posts.
- Validate every type with a test script in CI against Google's rich-result rules.

### Google Merchant Center feed

Generate /feeds/google-merchant.xml automatically from the catalogue, updated on every product save. Include id, title written like a search query (brand + type + key attribute), description, link, image links, price, sale price, availability, brand, GTIN, condition, gender, age_group, colour, size, size_system IN, material, product_type, shipping and return policy. Values must match the live product page exactly.

### Content built for ranking and AI citation

- Each category and product description opens with a plain definitional sentence: "Chelsea boots are ankle-high slip-on boots with elastic side panels."
- Seed the Journal with buying guides the owner can edit: how to choose a watch size for your wrist, formal shoe types explained, EDP vs EDT vs attar, Indian shoe size chart, how to care for leather shoes.
- Every guide links to the products and categories it mentions; every product links to its category, siblings and related guide.
- Local SEO: a store page for [City] with photos, map, hours and directions, matching the Google Business Profile word for word.

### Performance budgets (fail the build if missed)

| Metric | Target (mobile, 75th percentile) |
|---|---|
| Largest Contentful Paint | < 2.5 s (aim for 1.8 s) |
| Interaction to Next Paint | < 200 ms |
| Cumulative Layout Shift | < 0.1 |
| Lighthouse on home, category, product | Performance ≥ 95, SEO 100, Accessibility ≥ 95, Best Practices 100 |
| Client JavaScript on product page | < 120 KB gzipped |

- Preload the hero or main product image with fetchpriority="high"; lazy-load everything below the fold.
- Fonts self-hosted through next/font, subset, display: swap.
- Third-party scripts (analytics, pixel, chat) load only after consent and first interaction.
- Reserve space for every banner, image and review widget so nothing jumps.
- Recommend putting Cloudflare (free plan) in front of the host for CDN caching and compression.
- Report real-user Web Vitals to an API route and show them in the admin dashboard.

## Part 7 — Payments, shipping, security, deployment and build order

### Orders, payments and tax

- Razorpay: create the order on the server, verify the payment signature on the server, and handle webhooks (payment captured, failed, refunded) idempotently. Never trust a price or total sent from the browser.
- Cash on Delivery: admin-set order limit and fee, PIN codes where COD is allowed, confirmation by WhatsApp or OTP for orders above a set value.
- Reserve stock for 15 minutes when checkout starts; use database transactions so two buyers can never get the last pair.
- GST invoices: HSN code and GST rate are fields on each category or product (set by the owner with their accountant), never hard-coded. Invoice PDF shows GSTIN, HSN, taxable value and tax split.
- Notifications: order placed, shipped, out for delivery, delivered, refund, by email; WhatsApp through a provider adapter (Interakt, AiSensy or Gupshup); abandoned-cart email after 1 hour and 24 hours.

### Shipping

- Shipping zones and rates in admin, free-shipping threshold, and a Shiprocket adapter for live rates, AWB creation and tracking webhooks. Manual mode if Shiprocket is off.
- PIN code check returns a delivery date range shown on product, cart and checkout.

### Security and privacy

- Follow OWASP Top 10. Rate-limit login, OTP, coupon and checkout endpoints. Argon2 password hashing. Secure, HttpOnly, SameSite cookies.
- Strict security headers and a Content Security Policy. Sanitise all rich text on the server. Check uploaded files by real file type and size.
- API keys encrypted in the database; secrets only in environment variables; .env.example lists every variable.
- India's DPDP Act 2023: cookie and tracking consent banner, clear privacy policy, and customer data export and deletion requests in the account area.
- Daily database backup script with 14-day retention and a documented restore.

### Testing

- Vitest for business logic (prices, discounts, GST, stock). Playwright end-to-end tests: browse → filter → product → cart → checkout with Razorpay test mode and COD; admin creates a product with variants, images and video and it appears on the store.
- Lighthouse CI and structured-data validation run on every build.

### Deployment

Use output: "standalone" and Node.js 22 LTS. Write DEPLOY.md with step-by-step instructions for three targets:

1. A managed Node.js web-app plan (for example Hostinger Business or Cloud with Node.js apps) deploying from a GitHub repository.
2. A cPanel host with "Setup Node.js App" (Passenger), including a server.js entry file.
3. A VPS with PM2, Nginx reverse proxy and Let's Encrypt SSL.

For every target: environment variables, prisma migrate deploy, a persistent uploads folder outside the build folder, a /api/health route, and a GitHub Actions workflow that builds the app and uploads it, for hosts with too little memory to run next build.

### Deliverables

The complete repository, README.md, DEPLOY.md, ADMIN_GUIDE.md (written for a shop owner, not a developer, with screenshots described step by step), DECISIONS.md, .env.example, seed script and tests.

### Build order

Before writing any code, reply with the Prisma schema, the folder tree and the full page list, and wait for my approval. Then build in these phases, and at the end of each phase run the build, tests and Lighthouse, report what is done, and wait for me to say "continue":

1. Foundation: project setup, design tokens, fonts, layout shell, Prisma schema, seed data, authentication.
2. Catalogue: categories, brands, products, variants, category page, product page, search.
3. Cart and checkout: cart, checkout, Razorpay, COD, order emails.
4. Admin core: products with media, categories, orders, settings, staff roles.
5. SEO layer: metadata, JSON-LD, sitemaps, Merchant Center feed, robots, redirects.
6. Content: homepage builder, Journal, pages, reviews and Q&A.
7. Operations: shipping, returns and exchanges, discounts, customers, dashboard.
8. Hardening: security review, performance budget pass, accessibility audit, full test run, deployment docs.
