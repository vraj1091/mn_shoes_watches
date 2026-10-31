# MN Shoes & Watches

Online store, admin panel and backend for MN Shoes & Watches, Kalol (Gujarat), in one Next.js app.
SQLite database, so it runs on a Hostinger Business ("Unlimited") web hosting plan with no database server.

- Spec: [docs/BRIEF.md](docs/BRIEF.md)
- Folder tree and page list: [PLAN.md](PLAN.md)
- Why things are the way they are: [DECISIONS.md](DECISIONS.md)

## Stack

Next.js 16.4 (App Router, Cache Components, React 19) · TypeScript 6 (strict) · Tailwind CSS 4 ·
Prisma 7 with SQLite through better-sqlite3 · Better Auth 1.7 · next-themes · sharp · Vitest · Playwright.
Node.js 22 LTS or newer.

## Run it on your computer

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # then fill in BETTER_AUTH_SECRET and APP_ENCRYPTION_KEY (the file explains each)
npm run seed                # creates the database and fills the shop with demo products, photos and orders
npm run dev                 # http://localhost:3001
```

The shop is at <http://localhost:3001> and the admin at <http://localhost:3001/admin>.

### Admin login

| | |
|---|---|
| Email | `admin@example.com` |
| Password | `MnShoes-Admin-2026` |

These are the development defaults. To use your own, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` **before**
the first `npm run seed` (the older `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` names work too, and an existing
`.env` that sets them wins over the defaults). Once the owner account exists, the seed never changes it; change the
password under Admin → My account. A production seed refuses to run without your own `ADMIN_EMAIL` and
`ADMIN_PASSWORD`, and refuses the default password.

If you are not sure which account exists, the staff sign-in page lists the owner email(s) in development.

In production, owners and managers must also set up an authenticator app (two-factor sign-in) before the admin
opens. `ADMIN_REQUIRE_2FA=false` turns that off; `true` turns it on in development too.

**Locked out?** "Forgot your password?" on the staff sign-in emails a link to set a new one. If that is not enough
(lost phone and backup codes, switched-off account, too many attempts), run on the server:

```bash
npm run admin:recover -- owner@example.com                        # removes two-factor, switches the account on, signs it out everywhere
npm run admin:recover -- owner@example.com --password "new-long-password"   # and sets a new password (12+ characters)
```

The command clears the staff sign-in attempt counters too, and the Activity page records that it was used.

### Staff and roles

The owner invites people at Admin → **Staff**: name, email and role. They get an email with a link (valid 3 days) to
choose their own password; nobody else ever knows it. The owner can change a role, send a new link, reset someone's
two-factor after a lost phone, or switch an account off (that signs them out at once).

| Role | Can |
|---|---|
| Owner | Everything: settings, staff accounts, the activity log, removing demo data |
| Manager | Products, categories, brands, photos, orders, coupons, home banners, customers. No settings, no staff |
| Staff | View and update orders (status, courier and AWB, notes, tax invoice); view products and stock. Deletes nothing, no settings |

Nobody can change their own role or switch themselves off, and the last owner can never be demoted or switched off.
Admin → **Activity** shows every change made in the admin: who, what, when, and the before/after values.

Without SMTP settings, development saves every email (sign-in codes, order confirmations) as an HTML file in
`data/outbox`. Without Razorpay keys, checkout offers cash on delivery and a clearly labelled demo online payment
that charges nothing.

### Customer accounts

Shoppers can check out as guests or create an account at `/account/sign-up`: name, email, Indian mobile and a
password (at least 8 characters; common passwords are refused). A 6-digit code is emailed, and the account is saved only
once the code is entered. Sign-in is by password (with "Keep me signed in"), or by an emailed code; "Forgot password?"
sends a code to set a new one. A guest who ordered before and then signs up finds those orders in their account.
Signed-in shoppers get their details and last address filled in at checkout.

Without SMTP settings, development saves each email in `data/outbox` and prints the file path in the terminal, so the
codes can be read there.

## Demo data

`npm run seed` fills the shop so every page and feature can be tried:

- 46 products in the five departments, with sizes, stock (some sold out, some low), specifications and reviews.
  26 have real photos from [DummyJSON](https://dummyjson.com), a free demo-data API; the photos are downloaded
  into `public/demo/` so the site never loads them from elsewhere. The other 20 (the MN Atelier house brand:
  Indian footwear, belts, wallets, socks, watch straps, shoe care, attars) show a generated placeholder image and
  are marked "Replace photo" in the admin.
- 15 brands (including real names such as Rolex, Nike and Chanel, for demonstration only), 3 home banners,
  4 customers, 10 orders in every status, the coupons `WELCOME10` and `FLAT500`, and 3 Journal guides.

Every demo record is flagged as demo. Running `npm run seed` again replaces the demo data and leaves everything
else alone. If DummyJSON cannot be reached, the saved copy in `prisma/demo/dummyjson.json` is used
(`DEMO_OFFLINE=1` always uses it).

### Removing the demo data

Before going live: Admin → Settings → **Remove all demo data** (type `REMOVE` to confirm). It deletes the demo
products, brands, photos' records, reviews, orders, customers, coupons, banners and Journal posts. Your categories,
size charts, policy pages, delivery areas, settings, and every product or order you created yourself are kept.
An amber notice across the admin reminds you while demo data is still there.

## What the admin covers

- **Dashboard**: sales and orders for the last 30 days, average order value, low stock, recent orders and a
  checklist of what to set up before taking real orders.
- **Orders**: filter by status, search by number, name, phone or email; change status step by step (shipping asks
  for courier and AWB; cancelling restocks); internal notes; printable GST tax invoice (CGST + SGST or IGST).
- **Products**: search and filter (status, category, brand, low or no stock, placeholder photos); create, edit,
  duplicate, delete (archived instead once ordered); photo upload with drag-to-reorder and alt text; video link;
  UK sizes with price and stock per size; badges; filters; SEO fields; draft or active.
- **Categories** (tree, order, intro, subcategories), **Brands**, **Coupons**, **Customers** (orders, notes),
  **Home banners** (photo upload or a product photo, dates, order) and **Settings** (store details, address,
  delivery charges and COD, returns, announcement bar, invoices, demo data).
- **Staff** (invite, roles, switch off, reset two-factor) and **Activity** (the change log), for owners.

Every save shows in the shop on the next page load, with a confirmation in the corner of the admin. What each role
sees is in [Staff and roles](#staff-and-roles).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3001 |
| `npm run seed` | Create or update the database, then load the demo data (safe to run again) |
| `npm run build` | Production build (`.next/standalone`); needs no database and no secrets |
| `npm run start` | Serve the production build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against the production build, on a fresh database with the demo data in `data/e2e`; run `npm run build` first and `npx playwright install chromium` once |
| `npm run screenshots` | Full-page screenshots of the main pages, light and dark, at 390 and 1440 px, into `screenshots/` (needs `npm run dev` running) |
| `npm run tokens` | Regenerate `app/theme.css` and the icon from the colour tokens in `lib/design/tokens.ts` |
| `npm run check:contrast` | Check every text and control colour pair against WCAG AA, in light and dark |
| `npm run lighthouse` | Lighthouse CI on the production build (set `CHROME_PATH`, see `.github/workflows/ci.yml`) |
| `npm run db:migrate` | Apply migrations, regenerate the client |
| `npm run db:migrate:dev` | Create a migration after a schema change |
| `npm run db:seed` | Store structure and owner account only, no demo data |
| `npm run admin:recover -- <email> [--password "<new>"]` | Get a locked-out staff account back in (see [Admin login](#admin-login)) |
| `npm run db:reset` | Delete and recreate the local database |

## Colours and themes

Light and dark themes follow the device by default; the sun/moon switch in the header (and in the admin) overrides
it. All colours come from one file, `lib/design/tokens.ts` (Graphite neutrals, Oxford Navy for actions, Brass for
accents, plus red and green for status), which `npm run tokens` turns into the CSS variables in `app/theme.css`.
Components only use the semantic names (`bg-canvas`, `text-ink`, `bg-primary`…), never colour values.

## Data folder

Everything the app writes lives in `DATA_DIR` (default `./data`): `mn.db` (database), `cache.db` (page cache,
safe to delete), `search.db` (search index, rebuilt from products), `uploads/` (admin photo uploads, served at
`/media/…`), backups and the dev email outbox. On a host, `DATA_DIR` must point outside the app folder so
redeploys cannot overwrite it.
