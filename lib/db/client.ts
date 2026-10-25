import "server-only";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { databaseFile, databaseUrl } from "./paths";

/**
 * WAL lets shoppers keep reading while an order is written. The setting is stored in the
 * database file, so switching it on once per process start is enough. better-sqlite3 already
 * enables foreign keys, a 5 s busy timeout and synchronous=NORMAL under WAL by default.
 * If the host's disk refuses WAL (some network filesystems do), SQLite keeps its normal
 * rollback journal and /api/health reports which mode is active.
 */
function enableWal(): string {
  const db = new Database(databaseFile());
  try {
    return String(db.pragma("journal_mode = WAL", { simple: true }));
  } finally {
    db.close();
  }
}

function createClient() {
  const journalMode = enableWal();
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl() });
  const client = new PrismaClient({ adapter });
  return Object.assign(client, { journalMode });
}

type Client = ReturnType<typeof createClient>;

// One client per process, reused across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: Client };

function client(): Client {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * Opened on first use rather than on import, so `next build` (which imports server modules
 * but never queries them) does not create or touch a database file.
 */
export const prisma = new Proxy({} as Client, {
  get(_target, property) {
    const instance = client();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export const DEFAULT_STORE_ID = "main";
