import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";
import { DEFAULT_SLABS, type TaxSlab } from "@/lib/commerce/gst";
import type { ZoneRule } from "@/lib/commerce/delivery";
import type { CouponRule } from "@/lib/commerce/totals";

// ─── Tax classes ─────────────────────────────────────────────────────────────

async function loadTaxTable() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.categories);
  const [categories, classes] = await Promise.all([
    prisma.category.findMany({ where: { storeId: DEFAULT_STORE_ID }, select: { id: true, parentId: true, taxClassId: true } }),
    prisma.taxClass.findMany({ where: { storeId: DEFAULT_STORE_ID }, include: { slabs: true } }),
  ]);
  return {
    categories: Object.fromEntries(categories.map((category) => [category.id, { parentId: category.parentId, taxClassId: category.taxClassId }])),
    classes: Object.fromEntries(
      classes.map((taxClass) => [taxClass.id, { hsnCode: taxClass.hsnCode, slabs: taxClass.slabs.map((slab) => ({ maxUnitValue: slab.maxUnitValue, rateBp: slab.rateBp })) }]),
    ),
  };
}

export type TaxInfo = { hsnCode: string; slabs: TaxSlab[] };

/** Tax class for a product: its own, else the nearest category up the tree with one, else 18%. */
export async function taxLookup(): Promise<(product: { taxClassId: string | null; primaryCategoryId: string | null }) => TaxInfo> {
  await connection();
  const table = await loadTaxTable();
  return (product) => {
    if (product.taxClassId && table.classes[product.taxClassId]) return table.classes[product.taxClassId]!;
    let id = product.primaryCategoryId;
    while (id) {
      const category = table.categories[id];
      if (!category) break;
      if (category.taxClassId && table.classes[category.taxClassId]) return table.classes[category.taxClassId]!;
      id = category.parentId;
    }
    return { hsnCode: "", slabs: DEFAULT_SLABS };
  };
}

// ─── Shipping zones ─────────────────────────────────────────────────────────

const stringList = z.array(z.string());

async function loadZones(): Promise<ZoneRule[]> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.shipping);
  const zones = await prisma.shippingZone.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    orderBy: { position: "asc" },
    include: { rates: { where: { isActive: true }, orderBy: { price: "asc" }, take: 1 } },
  });
  return zones
    .filter((zone) => zone.rates.length > 0)
    .map((zone) => ({
      name: zone.name,
      stateCodes: stringList.catch([]).parse(zone.stateCodes),
      pinPrefixes: zone.pinPrefixes ? stringList.catch([]).parse(zone.pinPrefixes) : null,
      minDays: zone.rates[0]!.minDays,
      maxDays: zone.rates[0]!.maxDays,
      price: zone.rates[0]!.price,
      codAvailable: zone.rates[0]!.codAvailable,
    }));
}

export async function getShippingZones(): Promise<ZoneRule[]> {
  await connection();
  return loadZones();
}

/** Delivery charge before a PIN is known: the cheapest zone's rate. */
export async function defaultShippingRate(): Promise<number> {
  const zones = await getShippingZones();
  return zones.length ? Math.min(...zones.map((zone) => zone.price)) : 99_00;
}

// ─── Coupons ────────────────────────────────────────────────────────────────

export type Coupon = CouponRule & { label: string | null };

/** An active coupon by code (case-insensitive). Codes that apply to selected products only are not offered at checkout. */
export async function findCoupon(code: string, now = new Date()): Promise<Coupon | null> {
  const normalised = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,32}$/.test(normalised)) return null;
  const discount = await prisma.discount.findUnique({ where: { storeId_code: { storeId: DEFAULT_STORE_ID, code: normalised } } });
  if (!discount || !discount.isActive || discount.scope !== "ALL") return null;
  if (discount.startsAt > now || (discount.endsAt && discount.endsAt <= now)) return null;
  if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) return null;
  if (discount.type !== "PERCENT" && discount.type !== "FLAT" && discount.type !== "FREE_SHIPPING") return null;
  return {
    code: normalised,
    type: discount.type,
    value: discount.value,
    minOrderValue: discount.minOrderValue,
    maxDiscount: discount.maxDiscount,
    label: discount.publicLabel,
  };
}
