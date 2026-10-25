# MN Shoes & Watches — build plan (awaiting approval)

This file covers the folder tree and the full page list. The database schema is in
[prisma/schema.prisma](prisma/schema.prisma) and the reasoning behind both is in [DECISIONS.md](DECISIONS.md).
No application code is written until these three are approved.

## Versions

| Package | Version | Note |
|---|---|---|
| Next.js | 16.4.3 | Latest stable 16.x (App Router, Cache Components, Turbopack) |
| React | 19.2+ | Whatever Next 16.4 pins |
| Prisma ORM | 7.10.1 | npm's `latest` tag currently points at 8.0.0-rc.27, a release candidate; we pin the last stable |
| Better Auth | 1.7.x | Customer and staff auth |
| Tailwind CSS | 4.3.x | Tokens in `@theme` |
| Node.js | 22 LTS in production | Also runs on 24 (installed on this machine) |
| Database | SQLite 3.53 (bundled with better-sqlite3 13.0.3) | 96 tables in one file, opened through `@prisma/adapter-better-sqlite3`; search via FTS5. See DECISIONS 21–22 |
| Hosting target | Hostinger Business ("Unlimited") web hosting | Runs up to 5 Node.js apps; the Premium plan cannot run Node.js |

## Folder tree

```
mn-shoes-watches/
├── app/
│   ├── layout.tsx                      <html lang="en-IN">, fonts, theme (follows phone + manual toggle)
│   ├── globals.css                     Tailwind v4 @theme: Ink, Cognac, Bottle Green, type scale, radii
│   ├── robots.ts                       blocks private pages (Phase 2); crawler list from Settings in Phase 5
│   ├── manifest.ts
│   ├── sitemap.xml/route.ts            sitemap index
│   ├── sitemaps/[type]/route.ts        products, categories, collections, journal, pages, images, videos
│   ├── feeds/google-merchant.xml/route.ts
│   ├── media/[...key]/route.ts         serves local uploads with long cache headers (Nginx serves them directly on a VPS)
│   │
│   ├── (store)/
│   │   ├── layout.tsx                  announcement bar, header, mega menu, footer, consent banner, WhatsApp button
│   │   ├── page.tsx                    home: HomeSection blocks in the order set in admin
│   │   ├── [...path]/page.tsx          category paths and collection landing paths (see page list)
│   │   ├── product/[slug]/page.tsx
│   │   ├── product/[slug]/opengraph-image.tsx
│   │   ├── collections/[slug]/page.tsx
│   │   ├── gift-guides/page.tsx
│   │   ├── gift-guides/[slug]/page.tsx
│   │   ├── sale/page.tsx
│   │   ├── search/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── order/[token]/page.tsx      order confirmation
│   │   ├── track/page.tsx
│   │   ├── track/[number]/page.tsx
│   │   ├── wishlist/page.tsx
│   │   ├── account/                    sign-in, overview, orders, returns, addresses, profile, payment-methods, privacy
│   │   ├── journal/                    index, [slug], topic/[slug], author/[slug]
│   │   ├── about/  contact/  faq/
│   │   ├── stores/page.tsx
│   │   ├── stores/[slug]/page.tsx      e.g. /stores/kalol
│   │   ├── policies/[slug]/page.tsx
│   │   ├── pages/[slug]/page.tsx
│   │   ├── review/[token]/page.tsx
│   │   ├── unsubscribe/[token]/page.tsx
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   │
│   ├── admin/
│   │   ├── (auth)/sign-in/page.tsx
│   │   ├── (auth)/two-factor/page.tsx
│   │   └── (panel)/
│   │       ├── layout.tsx              sidebar, top bar, Ctrl+K palette, role guard, unsaved-changes guard
│   │       ├── page.tsx                dashboard
│   │       └── orders/ returns/ products/ inventory/ categories/ collections/ attributes/
│   │           size-charts/ customers/ discounts/ reviews/ questions/ content/ media/ seo/
│   │           settings/ staff/ activity/ account/
│   │
│   └── api/
│       ├── auth/[...all]/route.ts      customer auth (Better Auth)
│       ├── admin-auth/[...all]/route.ts staff auth (Better Auth, separate cookie)
│       ├── health/route.ts
│       ├── search/suggest/route.ts
│       ├── pincode/[pin]/route.ts
│       ├── vitals/route.ts
│       ├── uploads/route.ts            admin media upload (streamed; videos up to 50 MB)
│       ├── webhooks/razorpay/route.ts
│       ├── webhooks/shiprocket/route.ts
│       ├── webhooks/whatsapp/route.ts
│       ├── cron/route.ts               drains the job queue; called every minute by the host's cron
│       ├── account/export/route.ts     customer data export (DPDP)
│       └── admin/                      products.csv export/import, invoice and packing-slip PDFs
│
├── components/
│   ├── ui/          Radix-based primitives styled with the tokens: button, input, select, dialog, sheet, tabs, toast
│   ├── store/       header, mega-menu, search-dialog, product-card, gallery, variant-picker, size-guide,
│   │                pincode-check, cart-drawer, filters, sort, pagination, checkout/*, account/*
│   └── admin/       shell, command-palette, data-table, product-editor/*, variant-matrix, media-picker,
│                    rich-text-editor (Tiptap), seo-panel, snippet-preview, tree-editor, section-builder
│
├── lib/
│   ├── db/          Prisma client, SQLite settings (WAL, busy timeout), tenant scope, transaction helpers
│   ├── auth/        customer.ts, staff.ts, permissions.ts, argon2.ts
│   ├── catalog/     product and category queries, filters and facet counts, search and synonyms
│   ├── cart/  checkout/  orders/  inventory/  discounts/
│   ├── tax/         GST slabs, CGST/SGST/IGST split, invoice numbering and PDF
│   ├── payments/    adapter.ts, razorpay.ts, cod.ts
│   ├── shipping/    adapter.ts, shiprocket.ts, manual.ts, delivery-dates.ts, pincode.ts
│   ├── storage/     adapter.ts, local.ts, s3.ts, image-pipeline.ts (sharp → AVIF/WebP), video.ts
│   ├── seo/         metadata.ts, jsonld/*, sitemaps.ts, merchant-feed.ts, redirects.ts
│   ├── messaging/   email.ts, whatsapp/{interakt,aisensy,gupshup}.ts, sms/msg91.ts
│   ├── jobs/        queue.ts, handlers/*
│   ├── security/    rate-limit.ts, crypto.ts (AES-GCM for API keys), csp.ts, sanitize.ts, file-type.ts
│   ├── content/     Tiptap JSON → clean HTML
│   ├── validation/  Zod schemas shared by forms and server actions
│   ├── cache/       cache tag names and invalidation helpers
│   ├── analytics/   consent-gated GA4/Meta loaders, Web Vitals reporter
│   └── format/      money (paise ↔ ₹, Indian digit grouping), IST dates
│
├── messages/        en.json (hi.json and gu.json slot in later)
├── emails/          React Email templates
├── prisma/          schema.prisma, migrations/, seed/ (categories, attributes, 12 products, collections, owner)
├── scripts/         prepare-standalone.mjs, e2e-server.mjs, check-js-budget.mjs (Phase 1);
│                    backup-db.ts, restore-db.ts, import-pincodes.ts, check-structured-data.ts (later phases)
├── cache-handler.mjs  shared "use cache" store in DATA_DIR/cache.db (DECISIONS.md 24)
├── tests/           unit/ (Vitest), e2e/ (Playwright), fixtures/
├── public/          payment-method icons, static fallbacks
├── .github/workflows/  ci.yml (lint, types, tests, build, Lighthouse CI, structured data), deploy.yml
├── proxy.ts         Next 16's replacement for middleware: sign-in redirects (Phase 1), 301 redirects (Phase 5)
├── server.js        entry file for cPanel "Setup Node.js App" (Passenger)
├── next.config.ts   prisma.config.ts   tsconfig.json   eslint.config.mjs
├── vitest.config.ts playwright.config.ts lighthouserc.json
└── README.md  DEPLOY.md  ADMIN_GUIDE.md  DECISIONS.md  .env.example
```

## Page list — storefront

"Cached" pages are served from the cache and refreshed when the owner saves the related item in admin.
Per-shopper parts (bag count, stock check, delivery date) stream in without making the page uncacheable.

| URL | Page | Rendering | Search engines |
|---|---|---|---|
| `/` | Home | Cached | Indexed |
| `/mens-shoes`, `/mens-shoes/formal`, `/mens-shoes/formal/oxfords`, `/watches/women/automatic` … | Category (every level of the tree) | Cached; filtered views dynamic | Indexed. `?page=2` self-canonical; sort/tracking params canonicalise to the clean URL; other filter combinations `noindex, follow` |
| `/watches/men/under-5000`, `/mens-shoes/white-sneakers` … | Collection landing page (created in admin) | Cached | Indexed |
| `/product/{slug}` | Product | Cached; stock, PIN check and delivery date stream in | Indexed |
| `/collections/{slug}` | Collection without a landing path (incl. New arrivals, Bestsellers) | Cached | Indexed |
| `/sale` | Sale | Cached | Indexed |
| `/gift-guides` | Gift guides index | Cached | Indexed |
| `/gift-guides/{slug}` | Gift guide | Cached | Indexed |
| `/search?q=` | Search results with "Did you mean" | Dynamic | Blocked in robots.txt |
| `/cart` | Bag (full page; the drawer opens everywhere) | Dynamic | Blocked |
| `/checkout` | One-page guest checkout | Dynamic | Blocked |
| `/order/{token}` | Order confirmation + one-tap account creation | Dynamic | noindex |
| `/track` | Track an order (order number + phone) | Static | Indexed |
| `/track/{number}` | Tracking result | Dynamic | noindex |
| `/wishlist` | Wishlist (works for guests) | Dynamic | noindex |
| `/account/sign-in` | Email OTP, Google, phone OTP | Static | Blocked |
| `/account` | Overview | Dynamic | Blocked |
| `/account/orders` | Orders | Dynamic | Blocked |
| `/account/orders/{number}` | Order detail, invoice download | Dynamic | Blocked |
| `/account/orders/{number}/return` | Return or size exchange request | Dynamic | Blocked |
| `/account/returns` | Returns and exchanges | Dynamic | Blocked |
| `/account/addresses` | Addresses | Dynamic | Blocked |
| `/account/profile` | Profile, contact preferences | Dynamic | Blocked |
| `/account/payment-methods` | Saved cards/UPI (Razorpay tokens) | Dynamic | Blocked |
| `/account/privacy` | Download my data, delete my account | Dynamic | Blocked |
| `/journal` | Journal index | Cached | Indexed |
| `/journal/{slug}` | Article / buying guide | Cached | Indexed |
| `/journal/topic/{slug}` | Topic (Buying guides, Care, Style) | Cached | Indexed |
| `/journal/author/{slug}` | Author profile | Cached | Indexed |
| `/about` | About, with owner's signature | Cached | Indexed |
| `/contact` | Contact form, map, store photos | Cached | Indexed |
| `/faq` | FAQ | Cached | Indexed |
| `/stores` | Store locator | Cached | Indexed |
| `/stores/{slug}` | Local store page (e.g. `/stores/kalol`), matching the Google Business Profile | Cached | Indexed |
| `/policies/shipping` | Shipping policy | Cached | Indexed |
| `/policies/returns-and-exchanges` | Returns and exchanges | Cached | Indexed |
| `/policies/warranty` | Warranty | Cached | Indexed |
| `/policies/privacy` | Privacy policy (DPDP) | Cached | Indexed |
| `/policies/terms` | Terms of use | Cached | Indexed |
| `/pages/{slug}` | Any other owner page | Cached | Indexed |
| `/review/{token}` | Write a review (link from the day-5 email) | Dynamic | noindex |
| `/unsubscribe/{token}` | Email unsubscribe | Dynamic | noindex |
| `/robots.txt` | Crawl rules (see SEO section) | Static | — |
| any unknown URL, including unknown file paths | 404 with search, popular categories, bestsellers | — | 404 status |

How `/[...path]` resolves: the category whose `path` matches, then a collection whose `landingPath` matches, then 404.
Fixed routes (`/product`, `/collections`, `/journal`, …) always win over it, so a category can never shadow them.

## Page list — admin (`/admin`)

Roles: **O** Owner, **M** Manager, **C** Catalogue editor, **S** Order staff. "view" = read-only.

| URL | Page | O | M | C | S |
|---|---|---|---|---|---|
| `/admin/sign-in`, `/admin/two-factor` | Email + password, then TOTP | ✓ | ✓ | ✓ | ✓ |
| `/admin` | Dashboard: sales, orders, AOV, 30-day chart, pending orders, low stock, top products, abandoned carts, Web Vitals | ✓ | ✓ | catalogue widgets | order widgets |
| `/admin/orders`, `/admin/orders/{id}` | Orders list and detail: timeline, notes, invoice, packing slip, Shiprocket AWB, COD confirmation | ✓ | ✓ | view | ✓ |
| (inside order detail) | Refund through Razorpay | ✓ | ✓ | – | – |
| `/admin/returns`, `/admin/returns/{id}` | Approve, reject, size exchange → new order | ✓ | ✓ | – | ✓ |
| `/admin/products`, `/admin/products/new`, `/admin/products/{id}` | List with bulk edit; product editor (variants, media, video, SEO panel) | ✓ | ✓ | ✓ | view |
| `/admin/products/import` | CSV import and export | ✓ | ✓ | ✓ | – |
| `/admin/inventory` | Stock per variant, thresholds, movement history | ✓ | ✓ | ✓ | view |
| `/admin/categories`, `/admin/categories/{id}` | Drag-and-drop tree; intro, FAQ, filters, SEO | ✓ | ✓ | ✓ | – |
| `/admin/collections`, `/admin/collections/{id}` | Manual and rule-based collections, landing pages | ✓ | ✓ | ✓ | – |
| `/admin/attributes`, `/admin/attributes/{id}` | Attribute templates and values | ✓ | ✓ | ✓ | – |
| `/admin/size-charts` | Size charts | ✓ | ✓ | ✓ | – |
| `/admin/customers`, `/admin/customers/{id}` | Profiles, orders, notes, segments | ✓ | ✓ | – | ✓ |
| `/admin/customers/data-requests` | DPDP export and deletion requests | ✓ | ✓ | – | – |
| `/admin/discounts`, `/admin/discounts/{id}` | Coupons, automatic discounts, buy X get Y | ✓ | ✓ | – | – |
| `/admin/reviews` | Moderate and reply | ✓ | ✓ | ✓ | – |
| `/admin/questions` | Product Q&A | ✓ | ✓ | ✓ | – |
| `/admin/content/home` | Homepage section builder (toggle, reorder) | ✓ | ✓ | ✓ | – |
| `/admin/content/banners` | Hero and placement banners | ✓ | ✓ | ✓ | – |
| `/admin/content/pages`, `/admin/content/pages/{id}` | About, FAQ, policies, other pages | ✓ | ✓ | ✓ | – |
| `/admin/content/journal`, `/admin/content/journal/{id}` | Journal posts | ✓ | ✓ | ✓ | – |
| `/admin/content/authors` | Author profiles | ✓ | ✓ | ✓ | – |
| `/admin/content/navigation` | Mega menu and footer menus | ✓ | ✓ | ✓ | – |
| `/admin/media` | Media library: search, usage, safe delete | ✓ | ✓ | ✓ | – |
| `/admin/seo` | Reports: missing alt, missing meta, thin intros, broken links, missing GTIN | ✓ | ✓ | ✓ | – |
| `/admin/seo/redirects` | 301 redirect manager | ✓ | ✓ | ✓ | – |
| `/admin/seo/search` | Search synonyms, zero-result searches | ✓ | ✓ | ✓ | – |
| `/admin/seo/feeds` | Sitemap status, Merchant Center feed URL | ✓ | ✓ | ✓ | – |
| `/admin/settings/store` | Name, contact, GST, trust numbers, logo, favicon, social links, announcement bar | ✓ | ✓ | – | – |
| `/admin/settings/locations` | Store address, hours, map, photos | ✓ | ✓ | – | – |
| `/admin/settings/tax` | Tax classes, HSN codes, GST slabs | ✓ | ✓ | – | – |
| `/admin/settings/shipping` | Zones, rates, free-shipping threshold, PIN rules, holidays, COD rules | ✓ | ✓ | – | – |
| `/admin/settings/payments` | Razorpay keys, COD fee and limits | ✓ | – | – | – |
| `/admin/settings/integrations` | Shiprocket, WhatsApp provider, MSG91, email (SMTP/Resend) keys | ✓ | – | – | – |
| `/admin/settings/notifications` | Message wording per event and channel | ✓ | ✓ | – | – |
| `/admin/settings/seo` | Title templates, crawler list, analytics and verification IDs | ✓ | ✓ | – | – |
| `/admin/settings/privacy` | Consent banner text, policy version | ✓ | ✓ | – | – |
| `/admin/staff`, `/admin/staff/{id}` | Staff and roles | ✓ | – | – | – |
| `/admin/activity` | Full activity (audit) log | ✓ | view | – | – |
| `/admin/account` | My profile, password, two-factor | ✓ | ✓ | ✓ | ✓ |

## System routes

| Route | Purpose |
|---|---|
| `/robots.txt` | Blocks `/admin`, `/api`, `/cart`, `/checkout`, `/account`, `/search`; allows Googlebot, Bingbot, OAI-SearchBot, PerplexityBot (list editable) |
| `/sitemap.xml` + `/sitemaps/{type}.xml` | Segmented sitemaps; `lastmod` from `contentUpdatedAt` |
| `/feeds/google-merchant.xml` | Merchant Center feed, rebuilt on every product save |
| `/product/{slug}/opengraph-image` | Generated 1200×630 share image |
| `/media/{key}` | Uploaded files from the persistent uploads folder |
| `/api/health` | Health check for hosts and uptime monitors |
| `/api/cron` | Job queue: cart reminders, review requests, scheduled publishing, reservation cleanup, SEO audit, backups check |
| `/api/webhooks/*` | Razorpay, Shiprocket, WhatsApp, each verified by signature and processed once |
| `/api/vitals` | Real-user Web Vitals beacon |
