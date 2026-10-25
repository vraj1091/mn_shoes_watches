import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Fixed-window limit stored in the RateLimit table shared with Better Auth, so every Node
 * process on the host counts the same attempts (DECISIONS.md 14). One atomic statement: the
 * window resets when it has passed, otherwise the count goes up.
 * Keys are namespaced ("newsletter:<ip>") so they never collide with Better Auth's own keys.
 */
export async function rateLimit(key: string, { windowSeconds, max }: { windowSeconds: number; max: number }): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const rows = await prisma.$queryRaw<{ count: bigint | number; lastRequest: number }[]>`
    INSERT INTO "RateLimit" ("id", "key", "count", "lastRequest")
    VALUES (${randomUUID()}, ${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN ${now} - "lastRequest" >= ${windowMs} THEN 1 ELSE "count" + 1 END,
      "lastRequest" = CASE WHEN ${now} - "lastRequest" >= ${windowMs} THEN ${now} ELSE "lastRequest" END
    RETURNING "count", "lastRequest"
  `;
  const row = rows[0];
  const count = Number(row?.count ?? 1);
  const windowStart = Number(row?.lastRequest ?? now);
  const ok = count <= max;
  return {
    ok,
    remaining: Math.max(0, max - count),
    retryAfterSeconds: ok ? 0 : Math.ceil((windowStart + windowMs - now) / 1000),
  };
}
