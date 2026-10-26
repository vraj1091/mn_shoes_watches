import "server-only";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";

/** Wishlisted product ids for this browser (works without an account, DECISIONS.md 17). */
export async function wishlistIds(tokenHash: string | null): Promise<string[]> {
  if (!tokenHash) return [];
  const items = await prisma.wishlistItem.findMany({
    where: { storeId: DEFAULT_STORE_ID, guestTokenHash: tokenHash, product: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    select: { productId: true },
  });
  return items.map((item) => item.productId);
}

export async function toggleWishlistItem(tokenHash: string, productId: string): Promise<boolean> {
  const where = { storeId_guestTokenHash_productId: { storeId: DEFAULT_STORE_ID, guestTokenHash: tokenHash, productId } };
  const existing = await prisma.wishlistItem.findUnique({ where });
  if (existing) {
    await prisma.wishlistItem.delete({ where });
    return false;
  }
  const product = await prisma.product.findFirst({ where: { id: productId, storeId: DEFAULT_STORE_ID, status: "ACTIVE" }, select: { id: true } });
  if (!product) return false;
  await prisma.wishlistItem.create({ data: { storeId: DEFAULT_STORE_ID, guestTokenHash: tokenHash, productId } });
  return true;
}
