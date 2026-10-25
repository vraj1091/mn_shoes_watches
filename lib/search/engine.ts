import "server-only";
import Database from "better-sqlite3";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { searchIndexFile } from "@/lib/db/paths";
import { buildFtsQuery, expandSynonyms, normalise, suggestSpelling, tokenize, type Synonym } from "./text";

/*
 * Product search on SQLite FTS5 with the trigram tokenizer, in its own file (DATA_DIR/search.db;
 * DECISIONS.md 22). The index is derived data: before each search the catalogue's fingerprint
 * (active product count + latest product/category edit) is compared with the one the index was
 * built from, and the index rebuilds itself when they differ. It can be deleted at any time.
 */

let db: Database.Database | undefined;

function open(): Database.Database {
  if (db) return db;
  db = new Database(searchIndexFile());
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE VIRTUAL TABLE IF NOT EXISTS product_fts USING fts5(product_id UNINDEXED, title, body, tokenize = 'trigram');
    CREATE TABLE IF NOT EXISTS vocab (word TEXT PRIMARY KEY, freq INTEGER NOT NULL);
  `);
  return db;
}

let signatureMemo: { value: string; at: number } | undefined;

async function catalogSignature(): Promise<string> {
  // Suggestions fire on every keystroke; the fingerprint is re-read at most every 5 seconds per process.
  if (signatureMemo && Date.now() - signatureMemo.at < 5_000) return signatureMemo.value;
  const [products, latestCategory] = await Promise.all([
    prisma.product.aggregate({ where: { storeId: DEFAULT_STORE_ID, status: "ACTIVE" }, _count: true, _max: { updatedAt: true } }),
    prisma.category.aggregate({ where: { storeId: DEFAULT_STORE_ID }, _max: { updatedAt: true } }),
  ]);
  const value = `${products._count}:${products._max.updatedAt?.getTime() ?? 0}:${latestCategory._max.updatedAt?.getTime() ?? 0}`;
  signatureMemo = { value, at: Date.now() };
  return value;
}

let vocabularyMemo: { signature: string; words: Map<string, number> } | undefined;

async function ensureIndex(): Promise<string> {
  const signature = await catalogSignature();
  const database = open();
  const stored = database.prepare("SELECT value FROM meta WHERE key = 'signature'").get() as { value: string } | undefined;
  if (stored?.value === signature) return signature;

  const products = await prisma.product.findMany({
    where: { storeId: DEFAULT_STORE_ID, status: "ACTIVE" },
    select: { id: true, title: true, searchText: true, summary: true },
  });
  const frequencies = new Map<string, number>();
  for (const product of products) {
    for (const word of new Set(tokenize(`${product.title} ${product.searchText ?? ""}`))) {
      if (word.length >= 3 && !/^\d+$/.test(word)) frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    }
  }
  const insert = database.prepare("INSERT INTO product_fts (product_id, title, body) VALUES (?, ?, ?)");
  const insertWord = database.prepare("INSERT INTO vocab (word, freq) VALUES (?, ?)");
  database.transaction(() => {
    database.exec("DELETE FROM product_fts; DELETE FROM vocab;");
    for (const product of products) {
      insert.run(product.id, normalise(product.title), normalise(`${product.searchText ?? ""} ${product.summary ?? ""}`));
    }
    for (const [word, frequency] of frequencies) insertWord.run(word, frequency);
    database.prepare("INSERT INTO meta (key, value) VALUES ('signature', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(signature);
  })();
  vocabularyMemo = undefined;
  return signature;
}

function vocabulary(signature: string): Map<string, number> {
  if (vocabularyMemo?.signature === signature) return vocabularyMemo.words;
  const rows = open().prepare("SELECT word, freq FROM vocab").all() as { word: string; freq: number }[];
  vocabularyMemo = { signature, words: new Map(rows.map((row) => [row.word, row.freq])) };
  return vocabularyMemo.words;
}

function runMatch(query: string, limit: number): string[] {
  try {
    const rows = open()
      .prepare("SELECT product_id FROM product_fts WHERE product_fts MATCH ? ORDER BY bm25(product_fts, 0, 10.0, 1.0) LIMIT ?")
      .all(query, limit) as { product_id: string }[];
    return rows.map((row) => row.product_id);
  } catch (error) {
    console.error("[search] query failed", query, error);
    return [];
  }
}

/** Short queries (one or two letters) cannot use trigrams; match the start of titles instead. */
function runPrefix(text: string, limit: number): string[] {
  const rows = open()
    .prepare("SELECT product_id FROM product_fts WHERE title LIKE ? OR title LIKE ? LIMIT ?")
    .all(`${text}%`, `% ${text}%`, limit) as { product_id: string }[];
  return rows.map((row) => row.product_id);
}

export type SearchOutcome = {
  /** Product ids, best match first. */
  ids: string[];
  /** Set when nothing matched as typed and a corrected spelling did. */
  corrected: string | null;
};

export async function searchProducts(rawQuery: string, synonyms: Synonym[], limit = 500): Promise<SearchOutcome> {
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) return { ids: [], corrected: null };
  const signature = await ensureIndex();

  const groups = expandSynonyms(tokens, synonyms);
  const all = buildFtsQuery(groups, "all");
  if (!all) return { ids: runPrefix(tokens.join(" "), limit), corrected: null };

  const exact = runMatch(all, limit);
  if (exact.length > 0) return { ids: exact, corrected: null };

  const corrected = suggestSpelling(tokens, vocabulary(signature));
  if (corrected) {
    const correctedQuery = buildFtsQuery(expandSynonyms(tokenize(corrected), synonyms), "all");
    const ids = correctedQuery ? runMatch(correctedQuery, limit) : [];
    if (ids.length > 0) return { ids, corrected };
  }

  // Nothing matched every word: fall back to products matching any of them.
  const any = buildFtsQuery(groups, "any");
  return { ids: any ? runMatch(any, limit) : [], corrected: null };
}

/** Counts each search term, so the admin can see popular searches and searches with no results. */
export async function recordSearch(rawQuery: string, resultCount: number): Promise<void> {
  const term = normalise(rawQuery).slice(0, 120);
  if (!term) return;
  await prisma.searchTerm.upsert({
    where: { storeId_term: { storeId: DEFAULT_STORE_ID, term } },
    create: { term, searches: 1, lastResultCount: resultCount },
    update: { searches: { increment: 1 }, lastResultCount: resultCount, lastSearchedAt: new Date() },
  });
}
