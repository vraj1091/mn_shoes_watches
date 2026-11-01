// Build command for the Vercel demo (vercel.json; DECISIONS.md 76). Vercel keeps no files between
// server instances, so the demo database is made here, at build time, into demo-seed/mn.db, and
// each instance copies it to DATA_DIR when it starts (DATA_SEED_DIR, lib/db/paths.ts). Then the
// normal Next.js build, which ships demo-seed/ with the server code (next.config.ts).
// Needs ADMIN_EMAIL and ADMIN_PASSWORD: the seed runs as production, so it refuses the README's
// development password.
import { execSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const seedDir = path.resolve("demo-seed");
rmSync(seedDir, { recursive: true, force: true });

// DATA_SEED_DIR is the runtime setting that copies this database in; here the database is being made.
const env = { ...process.env, NODE_ENV: "production", DATA_DIR: seedDir, DATA_SEED_DIR: "", DEMO_OFFLINE: "1" };
execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
execSync("npx tsx scripts/seed-demo.ts", { env, stdio: "inherit" });

const db = new Database(path.join(seedDir, "mn.db"));
// The demo is public and full of real brand names: every page says it is a demo, in the announcement bar.
db.prepare(`UPDATE "StoreSettings" SET "announcementEnabled" = 1, "announcementText" = ?, "announcementHref" = NULL WHERE "storeId" = 'main'`).run(
  "Demo shop: orders here are not real, and nothing is charged or delivered.",
);
// One self-contained file: fold the write-ahead log into mn.db and switch it off, so mn.db alone
// is the whole database. The search index and page cache rebuild themselves at runtime.
db.pragma("wal_checkpoint(TRUNCATE)");
db.pragma("journal_mode = DELETE");
db.close();
for (const name of readdirSync(seedDir)) if (name !== "mn.db") rmSync(path.join(seedDir, name), { recursive: true, force: true });

execSync("npx next build", { stdio: "inherit" });
