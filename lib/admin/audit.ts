import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";

/** What an entry is about: "product", "order", "settings", "staff" and so on, and which one. */
export type AuditTarget = { type: string; id?: string | null };

/**
 * Records one admin change: who, what, which record, when, from where (DECISIONS.md 69).
 * Called after the change succeeds, so the log never shows something that did not happen.
 * `changes` holds before/after pairs for the fields that changed; never pass secrets. When it is
 * given but empty (a form saved without edits), nothing changed and nothing is logged.
 */
export async function audit(
  staffId: string,
  action: string,
  target: AuditTarget,
  summary: string,
  changes?: Record<string, [unknown, unknown]>,
): Promise<void> {
  if (changes && Object.keys(changes).length === 0) return;
  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
  } catch {
    // Outside a request (a script): no IP or browser to record.
  }
  await prisma.auditLog.create({
    data: {
      storeId: DEFAULT_STORE_ID,
      staffId,
      action,
      entityType: target.type,
      entityId: target.id ?? null,
      summary: summary.slice(0, 500),
      changes: changes && Object.keys(changes).length ? (changes as Prisma.InputJsonValue) : undefined,
      ipAddress,
      userAgent,
    },
  });
}

/** Before/after pairs for the keys whose values differ; dates and numbers compared by value. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const key of Object.keys(after)) {
    const a = before[key];
    const b = after[key];
    const same = a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    if (!same) out[key] = [a ?? null, b ?? null];
  }
  return out;
}
