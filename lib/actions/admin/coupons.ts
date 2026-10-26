"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { requireStaff } from "@/lib/auth/session";
import { refreshStorefront } from "@/lib/admin/refresh";
import { parseRupees } from "@/lib/format/money";
import type { FormState } from "@/components/admin/forms";

/*
 * Coupon codes for the whole order: a percentage (optionally capped), a flat amount, or free
 * delivery, with an optional minimum order, usage limit and date range. Checkout reads coupons
 * straight from the database, so a change applies to the next bag at once.
 */

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A date picked in the admin is an Indian calendar day: it starts at 00:00 IST and ends at 23:59:59 IST. */
const dayStart = (day: string) => new Date(`${day}T00:00:00+05:30`);
const dayEnd = (day: string) => new Date(`${day}T23:59:59+05:30`);

const optionalRupees = (label: string) =>
  z.string().transform((value, context) => {
    if (!value) return null;
    const paise = parseRupees(value);
    if (paise === null || paise <= 0) {
      context.addIssue({ code: "custom", message: `${label} must be an amount in rupees.` });
      return z.NEVER;
    }
    return paise;
  });

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,32}$/, "The code needs 3 to 32 letters or numbers, no spaces."),
    title: z.string().trim().max(80),
    publicLabel: z.string().trim().max(120),
    type: z.enum(["PERCENT", "FLAT", "FREE_SHIPPING"]),
    value: z.string(),
    maxDiscount: optionalRupees("The cap"),
    minOrderValue: optionalRupees("The minimum order"),
    usageLimit: z.string().regex(/^\d{0,7}$/, "The usage limit must be a whole number."),
    startsAt: z.string().regex(DATE, "Choose a start date."),
    endsAt: z.union([z.literal(""), z.string().regex(DATE)]),
    isActive: z.boolean(),
  })
  .superRefine((input, context) => {
    if (input.endsAt && input.endsAt < input.startsAt) context.addIssue({ code: "custom", message: "The end date is before the start date." });
  });

function valueFor(type: "PERCENT" | "FLAT" | "FREE_SHIPPING", raw: string): number | string {
  if (type === "FREE_SHIPPING") return 0;
  if (type === "PERCENT") {
    const percent = Number(raw);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 90) return "The percentage must be between 1 and 90.";
    return Math.round(percent * 100);
  }
  const paise = parseRupees(raw);
  return paise === null || paise <= 0 ? "Enter the amount off in rupees." : paise;
}

export async function saveCoupon(id: string | null, _state: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("discounts.manage");
  const parsed = couponSchema.safeParse({
    code: text(formData, "code"),
    title: text(formData, "title"),
    publicLabel: text(formData, "publicLabel"),
    type: text(formData, "type"),
    value: text(formData, "value"),
    maxDiscount: text(formData, "maxDiscount"),
    minOrderValue: text(formData, "minOrderValue"),
    usageLimit: text(formData, "usageLimit"),
    startsAt: text(formData, "startsAt"),
    endsAt: text(formData, "endsAt"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { status: "error", message: "Please fix the following:", errors: parsed.error.issues.map((issue) => issue.message) };
  const input = parsed.data;
  const value = valueFor(input.type, input.value);
  if (typeof value === "string") return { status: "error", message: value };
  if (input.type === "FLAT" && input.minOrderValue !== null && value >= input.minOrderValue) {
    return { status: "error", message: "The amount off must be less than the minimum order, or the order could be free." };
  }
  const clash = await prisma.discount.findFirst({ where: { storeId: DEFAULT_STORE_ID, code: input.code, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (clash) return { status: "error", message: `The code ${input.code} is already used by another coupon.` };

  const data = {
    code: input.code,
    title: input.title || input.code,
    publicLabel: input.publicLabel || null,
    type: input.type,
    value,
    maxDiscount: input.type === "PERCENT" ? input.maxDiscount : null,
    minOrderValue: input.minOrderValue,
    usageLimit: input.usageLimit ? Number(input.usageLimit) : null,
    startsAt: dayStart(input.startsAt),
    endsAt: input.endsAt ? dayEnd(input.endsAt) : null,
    isActive: input.isActive,
    scope: "ALL" as const,
  };
  if (id) {
    const existing = await prisma.discount.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, select: { id: true } });
    if (!existing) return { status: "error", message: "This coupon no longer exists." };
    await prisma.discount.update({ where: { id }, data });
    refreshStorefront("discounts");
    return { status: "saved", message: "Saved. Checkout uses the new rules from now on." };
  }
  const created = await prisma.discount.create({ data: { storeId: DEFAULT_STORE_ID, ...data } });
  refreshStorefront("discounts");
  redirect(`/admin/coupons/${created.id}?created=1`);
}

/** Deletes a coupon nobody has used; a used one is switched off so past orders still show it. */
export async function deleteCoupon(id: string) {
  await requireStaff("discounts.manage");
  const coupon = await prisma.discount.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, select: { usageCount: true, _count: { select: { redemptions: true } } } });
  if (!coupon) redirect("/admin/coupons");
  if (coupon.usageCount > 0 || coupon._count.redemptions > 0) {
    await prisma.discount.update({ where: { id }, data: { isActive: false } });
    refreshStorefront("discounts");
    redirect("/admin/coupons?disabled=1");
  }
  await prisma.discount.delete({ where: { id } });
  refreshStorefront("discounts");
  redirect("/admin/coupons?deleted=1");
}
