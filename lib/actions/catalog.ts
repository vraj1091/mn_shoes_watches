"use server";

import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { resolveListing } from "@/lib/catalog/scope";
import { toCards } from "@/lib/catalog/cards";
import { clientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";
import type { ProductCardData } from "@/lib/catalog/types";

const scopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("category"), path: z.string().max(255) }),
  z.object({ kind: z.literal("brand"), slug: z.string().max(160) }),
  z.object({ kind: z.literal("collection"), slug: z.string().max(160) }),
  z.object({ kind: z.literal("landing"), path: z.string().max(255) }),
  z.object({ kind: z.literal("sale") }),
  z.object({ kind: z.literal("search"), q: z.string().max(120) }),
]);

const loadMoreSchema = z.object({
  scope: scopeSchema,
  params: z.record(z.string().max(60), z.array(z.string().max(80)).max(40)),
  page: z.number().int().min(2).max(500),
});

/** The next page of a listing for the "Show more products" button. Same engine as the page itself. */
export async function loadMoreProducts(input: z.input<typeof loadMoreSchema>): Promise<{ cards: ProductCardData[]; page: number; hasMore: boolean }> {
  const { scope, params, page } = loadMoreSchema.parse(input);
  const listing = await resolveListing(scope, { ...params, page: String(page) });
  if (!listing || listing.result.page !== page) return { cards: [], page, hasMore: false };
  return {
    cards: toCards(listing.result.items, listing.index.lowStockThreshold),
    page,
    hasMore: page < listing.result.pageCount,
  };
}

export type NotifyState = { status: "idle" | "done" | "invalid" | "busy" | "error" };

/** "Notify me" for a sold-out variant. The email goes out when stock returns (Phase 7 job). */
export async function requestBackInStock(_previous: NotifyState, formData: FormData): Promise<NotifyState> {
  const parsed = z
    .object({ variantId: z.string().min(1).max(40), email: z.email().max(191) })
    .safeParse({ variantId: formData.get("variantId"), email: String(formData.get("email") ?? "").trim().toLowerCase() });
  if (!parsed.success) return { status: "invalid" };

  const limit = await rateLimit(`notify:${await clientIp()}`, { windowSeconds: 60, max: 5 });
  if (!limit.ok) return { status: "busy" };

  try {
    const variant = await prisma.productVariant.findFirst({
      where: { id: parsed.data.variantId, storeId: DEFAULT_STORE_ID, isActive: true },
      select: { id: true },
    });
    if (!variant) return { status: "error" };
    await prisma.backInStockRequest.upsert({
      where: { variantId_email: { variantId: variant.id, email: parsed.data.email } },
      create: { variantId: variant.id, email: parsed.data.email },
      update: { notifiedAt: null },
    });
    return { status: "done" };
  } catch (error) {
    console.error("[notify] could not save request", error);
    return { status: "error" };
  }
}
