// "use cache" handler backed by a SQLite file (DATA_DIR/cache.db).
//
// Next.js keeps "use cache" entries and tag invalidations in each process's memory by default.
// A shared host may run several Node processes and stops idle ones, so an admin edit handled by
// one process would leave the others serving old pages, and every restart would start cold.
// Keeping both entries and tag timestamps in one SQLite file fixes both. See DECISIONS.md 24.

import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const MAX_BYTES = Number(process.env.CACHE_MAX_BYTES ?? 200 * 1024 * 1024);
const PRUNE_EVERY_WRITES = 200;

let store;

// Opened on first use, so loading the handler during `next build` creates no file.
function open() {
  if (store) return store;
  // turbopackIgnore: a runtime path, not something the build should trace into the output.
  const dataDir = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? "data");
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(/*turbopackIgnore: true*/ dataDir, "cache.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      key        TEXT PRIMARY KEY,
      value      BLOB NOT NULL,
      tags       TEXT NOT NULL,
      stale      INTEGER NOT NULL,
      timestamp  INTEGER NOT NULL,
      expire     INTEGER NOT NULL,
      revalidate INTEGER NOT NULL,
      size       INTEGER NOT NULL,
      read_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS entries_read_at ON entries (read_at);
    CREATE TABLE IF NOT EXISTS tags (
      tag     TEXT PRIMARY KEY,
      stale   INTEGER,
      expired INTEGER
    );
  `);
  store = {
    db,
    selectEntry: db.prepare("SELECT * FROM entries WHERE key = ?"),
    touchEntry: db.prepare("UPDATE entries SET read_at = ? WHERE key = ?"),
    upsertEntry: db.prepare(`
      INSERT INTO entries (key, value, tags, stale, timestamp, expire, revalidate, size, read_at)
      VALUES (@key, @value, @tags, @stale, @timestamp, @expire, @revalidate, @size, @read_at)
      ON CONFLICT (key) DO UPDATE SET
        value = excluded.value, tags = excluded.tags, stale = excluded.stale,
        timestamp = excluded.timestamp, expire = excluded.expire, revalidate = excluded.revalidate,
        size = excluded.size, read_at = excluded.read_at
    `),
    selectTag: db.prepare("SELECT stale, expired FROM tags WHERE tag = ?"),
    upsertTag: db.prepare(`
      INSERT INTO tags (tag, stale, expired) VALUES (@tag, @stale, @expired)
      ON CONFLICT (tag) DO UPDATE SET
        stale = COALESCE(excluded.stale, tags.stale),
        expired = COALESCE(excluded.expired, tags.expired)
    `),
    deleteExpired: db.prepare("DELETE FROM entries WHERE timestamp + expire * 1000 < ?"),
    totalSize: db.prepare("SELECT COALESCE(SUM(size), 0) AS bytes FROM entries"),
    deleteLeastRecent: db.prepare("DELETE FROM entries WHERE key IN (SELECT key FROM entries ORDER BY read_at ASC LIMIT ?)"),
  };
  return store;
}

const pendingSets = new Map();
let writesSincePrune = 0;

const now = () => Date.now();

function tagState(tags, timestamp) {
  const { selectTag } = open();
  let expired = false;
  let stale = false;
  const at = now();
  for (const tag of tags) {
    const row = selectTag.get(tag);
    if (!row) continue;
    if (row.expired && row.expired > timestamp && row.expired <= at) expired = true;
    if (row.stale && row.stale > timestamp) stale = true;
  }
  return { expired, stale };
}

function prune() {
  const { deleteExpired, totalSize, deleteLeastRecent } = open();
  deleteExpired.run(now());
  let { bytes } = totalSize.get();
  while (bytes > MAX_BYTES) {
    const removed = deleteLeastRecent.run(50).changes;
    if (removed === 0) break;
    ({ bytes } = totalSize.get());
  }
}

function streamOf(buffer) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    },
  });
}

/** @type {import("next/cache").CacheHandler} */
const handler = {
  async get(cacheKey) {
    const pending = pendingSets.get(cacheKey);
    if (pending) await pending;

    const { selectEntry, touchEntry } = open();
    const row = selectEntry.get(cacheKey);
    if (!row) return undefined;

    const tags = JSON.parse(row.tags);
    const { expired, stale } = tagState(tags, row.timestamp);
    if (expired) return undefined;

    touchEntry.run(now(), cacheKey);
    return {
      value: streamOf(row.value),
      tags,
      stale: row.stale,
      timestamp: row.timestamp,
      expire: row.expire,
      // A stale tag serves this copy once more while Next.js renders a fresh one.
      revalidate: stale ? -1 : row.revalidate,
    };
  },

  async set(cacheKey, pendingEntry) {
    let resolvePending = () => {};
    pendingSets.set(cacheKey, new Promise((resolve) => (resolvePending = resolve)));
    try {
      const entry = await pendingEntry;
      // expire 0 marks a dynamic entry that Next.js regenerates on every read anyway.
      if (entry.expire === 0) return;
      const value = Buffer.from(await new Response(entry.value).arrayBuffer());
      open().upsertEntry.run({
        key: cacheKey,
        value,
        tags: JSON.stringify(entry.tags),
        stale: entry.stale,
        timestamp: entry.timestamp,
        expire: entry.expire,
        revalidate: entry.revalidate,
        size: value.byteLength,
        read_at: now(),
      });
      if (++writesSincePrune >= PRUNE_EVERY_WRITES) {
        writesSincePrune = 0;
        prune();
      }
    } catch (error) {
      // An entry whose render failed part-way is dropped; the next read renders it again.
      console.error("[cache] failed to store entry", cacheKey, error);
    } finally {
      resolvePending();
      pendingSets.delete(cacheKey);
    }
  },

  // Tags are read from the shared file on every check, so there is nothing to sync.
  async refreshTags() {},

  async getExpiration(tags) {
    const { selectTag } = open();
    let latest = 0;
    for (const tag of tags) {
      const row = selectTag.get(tag);
      if (row?.expired && row.expired > latest) latest = row.expired;
    }
    return latest;
  },

  async updateTags(tags, durations) {
    const { db, upsertTag } = open();
    const at = now();
    db.transaction(() => {
      for (const tag of tags) {
        if (durations) {
          upsertTag.run({
            tag,
            stale: at,
            expired: durations.expire !== undefined ? at + durations.expire * 1000 : null,
          });
        } else {
          upsertTag.run({ tag, stale: null, expired: at });
        }
      }
    })();
  },
};

export default handler;
