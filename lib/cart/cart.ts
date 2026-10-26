import "server-only";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { mediaUrl } from "@/lib/media/url";
import { rateForUnitPrice } from "@/lib/commerce/gst";
import { computeTotals, type Totals } from "@/lib/commerce/totals";
import { zoneFor } from "@/lib/commerce/delivery";
import { isValidPin } from "@/lib/commerce/india";
import { defaultShippingRate, findCoupon, getShippingZones, taxLookup } from "@/lib/data/commerce";
import { getStoreSettings } from "@/lib/data/store";

/*
 * The bag, stored in the database against the shopper's token hash. Every view is recalculated
 * from current prices and stock, so what the shopper sees is what checkout will charge.
 */

/** Most of one size or colour a shopper can buy in one order. */
export const MAX_QUANTITY = 5;

export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  brand: string | null;
  variantTitle: string | null;
  sku: string;
  image: { url: string; alt: string; blurDataUrl: string | null } | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  maxQuantity: number;
  available: boolean;
  lineTotal: number;
  /** The price went up or down since it was added. */
  priceChanged: boolean;
  rateBp: number;
  hsnCode: string;
};

export type CartView = {
  lines: CartLine[];
  count: number;
  totals: Totals;
  coupon: { code: string; label: string | null; problem: "MIN_ORDER" | "INVALID" | null } | null;
  freeShippingThreshold: number | null;
  pinCode: string | null;
};

const cartInclude = {
  items: {
    where: { savedForLater: false },
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: {
            include: {
              brand: { select: { name: true } },
              media: { where: { role: "GALLERY" }, orderBy: { position: "asc" }, take: 1, include: { media: true } },
            },
          },
        },
      },
    },
  },
} as const;

async function loadCart(tokenHash: string) {
  return prisma.cart.findUnique({ where: { tokenHash }, include: cartInclude });
}

export async function cartCount(tokenHash: string | null): Promise<number> {
  if (!tokenHash) return 0;
  const result = await prisma.cartItem.aggregate({ where: { cart: { tokenHash }, savedForLater: false }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

export async function buildCartView(tokenHash: string | null, paymentMethod: "PREPAID" | "COD" | null = null): Promise<CartView> {
  const [cart, settings, tax, zones, baseRate] = await Promise.all([
    tokenHash ? loadCart(tokenHash) : null,
    getStoreSettings(),
    taxLookup(),
    getShippingZones(),
    defaultShippingRate(),
  ]);

  const lines: CartLine[] = (cart?.items ?? []).map((item) => {
    const { variant } = item;
    const { product } = variant;
    const stock = Math.max(0, variant.stockOnHand);
    const available = variant.isActive && product.status === "ACTIVE" && stock > 0;
    const quantity = available ? Math.min(item.quantity, stock, MAX_QUANTITY) : item.quantity;
    const media = product.media[0]?.media;
    const info = tax({ taxClassId: product.taxClassId, primaryCategoryId: product.primaryCategoryId });
    return {
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      title: product.title,
      brand: product.brand?.name ?? null,
      variantTitle: variant.title === "Default" ? null : variant.title,
      sku: variant.sku,
      image: media?.key ? { url: mediaUrl(media.key), alt: media.alt ?? product.title, blurDataUrl: media.blurDataUrl } : null,
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice && variant.compareAtPrice > variant.price ? variant.compareAtPrice : null,
      quantity,
      maxQuantity: Math.min(stock, MAX_QUANTITY),
      available,
      lineTotal: variant.price * quantity,
      priceChanged: item.unitPriceSeen !== variant.price,
      rateBp: rateForUnitPrice(variant.price, info.slabs),
      hsnCode: info.hsnCode,
    };
  });

  const coupon = cart?.couponCode ? await findCoupon(cart.couponCode) : null;
  const pin = cart?.pinCode && isValidPin(cart.pinCode) ? cart.pinCode : null;
  const zone = pin ? zoneFor(pin, zones) : null;
  const payable = lines.filter((line) => line.available);
  const totals = computeTotals({
    lines: payable.map((line) => ({ key: line.variantId, unitPrice: line.unitPrice, quantity: line.quantity, rateBp: line.rateBp })),
    coupon,
    freeShippingThreshold: settings.freeShippingThreshold,
    shippingRate: zone?.price ?? baseRate,
    paymentMethod,
    codFee: settings.codFee,
  });

  return {
    lines,
    count: payable.reduce((sum, line) => sum + line.quantity, 0),
    totals,
    coupon: cart?.couponCode
      ? { code: cart.couponCode, label: coupon?.label ?? null, problem: coupon ? totals.couponProblem : "INVALID" }
      : null,
    freeShippingThreshold: settings.freeShippingThreshold,
    pinCode: pin,
  };
}

export type CartChange = { ok: true } | { ok: false; reason: "NOT_FOUND" | "SOLD_OUT" | "LIMIT" };

async function ensureCart(tokenHash: string) {
  return prisma.cart.upsert({
    where: { tokenHash },
    create: { storeId: DEFAULT_STORE_ID, tokenHash },
    update: { lastActivityAt: new Date(), status: "ACTIVE" },
  });
}

export async function addItem(tokenHash: string, variantId: string, quantity: number): Promise<CartChange> {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { status: true, storeId: true } } } });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE" || variant.product.storeId !== DEFAULT_STORE_ID) return { ok: false, reason: "NOT_FOUND" };
  if (variant.stockOnHand <= 0) return { ok: false, reason: "SOLD_OUT" };
  const cart = await ensureCart(tokenHash);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const limit = Math.min(variant.stockOnHand, MAX_QUANTITY);
  if (existing && existing.quantity >= limit) return { ok: false, reason: "LIMIT" };
  const next = Math.min((existing?.quantity ?? 0) + Math.max(1, quantity), limit);
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { storeId: DEFAULT_STORE_ID, cartId: cart.id, variantId, quantity: next, unitPriceSeen: variant.price },
    update: { quantity: next, unitPriceSeen: variant.price, savedForLater: false },
  });
  return { ok: true };
}

export async function setQuantity(tokenHash: string, variantId: string, quantity: number): Promise<CartChange> {
  const cart = await loadCart(tokenHash);
  const item = cart?.items.find((entry) => entry.variantId === variantId);
  if (!cart || !item) return { ok: false, reason: "NOT_FOUND" };
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return { ok: true };
  }
  const limit = Math.min(Math.max(0, item.variant.stockOnHand), MAX_QUANTITY);
  if (limit === 0) return { ok: false, reason: "SOLD_OUT" };
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(quantity, limit), unitPriceSeen: item.variant.price } });
  await prisma.cart.update({ where: { id: cart.id }, data: { lastActivityAt: new Date() } });
  return { ok: true };
}

export async function setCoupon(tokenHash: string, code: string | null): Promise<"APPLIED" | "REMOVED" | "INVALID"> {
  if (code === null) {
    await prisma.cart.updateMany({ where: { tokenHash }, data: { couponCode: null } });
    return "REMOVED";
  }
  const coupon = await findCoupon(code);
  if (!coupon) return "INVALID";
  await ensureCart(tokenHash);
  await prisma.cart.update({ where: { tokenHash }, data: { couponCode: coupon.code } });
  return "APPLIED";
}

export async function setCartPin(tokenHash: string, pin: string) {
  if (!isValidPin(pin)) return;
  await ensureCart(tokenHash);
  await prisma.cart.update({ where: { tokenHash }, data: { pinCode: pin } });
}

/** After an order: empty the bag but keep the same cart (and cookie) for next time. */
export async function emptyCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
  await prisma.cart.update({ where: { id: cartId }, data: { couponCode: null, recoveredAt: null } });
}
