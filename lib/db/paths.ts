import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Everything the shop writes at runtime lives under DATA_DIR: the SQLite database, the search
 * index, the page cache, uploads and backups. On a host it must point outside the app folder so
 * a redeploy cannot overwrite it (see DECISIONS.md 21).
 *
 * The turbopackIgnore comments tell the bundler these are runtime paths, so it does not try to
 * trace (and ship) the whole project folder into the server build.
 */
export function dataDir(): string {
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? "data");
  mkdirSync(dir, { recursive: true });
  startFromSeedCopy(dir);
  return dir;
}

let seedChecked = false;

/**
 * The Vercel demo only (DECISIONS.md 76): Vercel keeps no files between server instances, so
 * DATA_SEED_DIR names a database prepared at build time (scripts/vercel-build.mjs) and each new
 * instance copies it into DATA_DIR (/tmp) before first use. Changes last as long as the instance.
 * The real shop never sets DATA_SEED_DIR, and an existing database is never overwritten.
 */
function startFromSeedCopy(dir: string) {
  const source = process.env.DATA_SEED_DIR;
  if (seedChecked || !source) return;
  seedChecked = true;
  const target = path.join(dir, "mn.db");
  if (!existsSync(target)) copyFileSync(path.resolve(/*turbopackIgnore: true*/ source, "mn.db"), target);
}

export function dataPath(...segments: string[]): string {
  return path.join(/*turbopackIgnore: true*/ dataDir(), ...segments);
}

export const databaseFile = () => dataPath("mn.db");
export const searchIndexFile = () => dataPath("search.db");
export const cacheFile = () => dataPath("cache.db");

/** Prisma expects a file: URL with forward slashes, also on Windows. */
export const databaseUrl = () => `file:${databaseFile().replaceAll("\\", "/")}`;
