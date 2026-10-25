# MN Shoes & Watches

Online store, admin panel and backend for MN Shoes & Watches, Kalol (Gujarat), in one Next.js app.
SQLite database, so it runs on a Hostinger Business ("Unlimited") web hosting plan with no database server.

- Spec: [docs/BRIEF.md](docs/BRIEF.md)
- Folder tree and page list: [PLAN.md](PLAN.md)
- Why things are the way they are: [DECISIONS.md](DECISIONS.md)
- Deployment and the shop owner's guide arrive in Phase 8 (`DEPLOY.md`, `ADMIN_GUIDE.md`).

## Stack

Next.js 16.4 (App Router, Cache Components, React 19) · TypeScript 6 (strict) · Tailwind CSS 4 ·
Prisma 7 with SQLite through better-sqlite3 · Better Auth 1.7 · Vitest · Playwright · Lighthouse CI.
Node.js 22 LTS or newer.

## First run

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # then fill in the secrets; the file explains each one
npm run db:migrate          # creates DATA_DIR/mn.db
npm run db:seed             # categories, attributes, sample products, owner account
npm run dev                 # http://localhost:3000
```

Sign in to the admin at `/admin/sign-in` with `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` from `.env`. The owner is
asked to set up an authenticator app before the admin opens.

Without SMTP settings, development saves every email (including sign-in codes) as an HTML file in `data/outbox`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (`.next/standalone`); needs no database and no secrets |
| `npm run start` | Serve the production build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against the production build, on a fresh database in `data/e2e`; run `npm run build` first and `npx playwright install chromium` once |
| `npm run lighthouse` | Lighthouse CI on the production build (set `CHROME_PATH`, see `.github/workflows/ci.yml`) |
| `npm run db:migrate` | Apply migrations, regenerate the client |
| `npm run db:migrate:dev` | Create a migration after a schema change |
| `npm run db:seed` | Seed (safe to run again: never overwrites the owner's data) |
| `npm run db:reset` | Delete and recreate the local database |

## Data folder

Everything the app writes lives in `DATA_DIR` (default `./data`): `mn.db` (database), `cache.db` (page cache,
safe to delete), `search.db` (search index, rebuilt from products), uploads, backups and the dev email outbox.
On a host, `DATA_DIR` must point outside the app folder so redeploys cannot overwrite it.

## Build progress

| Phase | Status |
|---|---|
| 1. Foundation: setup, design tokens, layout, schema, seed, authentication | Done |
| 2. Catalogue: categories (no brands), products, variants, category and product pages, search | Done, awaiting review |
| 3. Cart and checkout | Next |
| 3–8 | See [docs/BRIEF.md](docs/BRIEF.md), Part 7 |
