"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { requireStaff } from "@/lib/auth/session";
import { refreshStorefront } from "@/lib/admin/refresh";
import { ALL_TAGS } from "@/lib/cache/tags";
import { isValidPin, stateName } from "@/lib/commerce/india";
import { removeDemoData } from "@/lib/demo/remove";
import { parseRupees } from "@/lib/format/money";
import { normaliseIndianMobile } from "@/lib/format/phone";
import type { FormState } from "@/components/admin/forms";

/*
 * Settings, one form per section so the owner can change the COD fee without first filling in
 * every store detail. Settings feed the header, footer, checkout totals and delivery estimates.
 */

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const checked = (formData: FormData, name: string) => formData.get(name) === "on";
const failed = (error: z.ZodError): FormState => ({ status: "error", message: "Please fix the following:", errors: error.issues.map((issue) => issue.message) });

/** A shop phone: an Indian mobile becomes +91XXXXXXXXXX; a landline with its STD code is kept as typed. */
function shopPhone(input: string): string | null {
  const mobile = normaliseIndianMobile(input);
  if (mobile) return mobile;
  const digits = input.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13 && /^[+\d][\d\s-]+$/.test(input) ? input.replace(/\s+/g, " ") : null;
}

const rupeesOrEmpty = (label: string) =>
  z.string().transform((value, context) => {
    if (!value) return null;
    const paise = parseRupees(value);
    if (paise === null) {
      context.addIssue({ code: "custom", message: `${label} must be an amount in rupees.` });
      return z.NEVER;
    }
    return paise;
  });

const wholeNumber = (label: string, min: number, max: number) =>
  z.coerce.number({ message: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} can be at most ${max}.`);

async function settingsUpdate(data: Parameters<typeof prisma.storeSettings.update>[0]["data"], userId: string) {
  await prisma.storeSettings.update({ where: { storeId: DEFAULT_STORE_ID }, data: { ...data, updatedById: userId } });
}

// ─── Store details ─────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  storeName: z.string().trim().min(2, "Enter the shop name.").max(60),
  legalName: z.string().trim().min(2, "Enter the registered business name (as on your GST certificate or bank account).").max(120),
  email: z.email("Enter the shop email address."),
  phone: z.string().transform((value, context) => shopPhone(value) ?? (context.addIssue({ code: "custom", message: "Enter the shop phone with its 10 digits." }), z.NEVER)),
  whatsapp: z.string().transform((value, context) =>
    value ? (normaliseIndianMobile(value) ?? (context.addIssue({ code: "custom", message: "The WhatsApp number must be a 10-digit Indian mobile." }), z.NEVER)) : null,
  ),
  gstin: z.union([z.literal(""), z.string().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "The GSTIN should be 15 characters, like 24ABCDE1234F1Z5.")]),
  gstStateCode: z.string().refine((code) => stateName(code) !== null, "Choose the state you are registered in."),
});

export async function saveStoreDetails(_state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("settings.manage");
  const parsed = detailsSchema.safeParse({
    storeName: text(formData, "storeName"),
    legalName: text(formData, "legalName"),
    email: text(formData, "email").toLowerCase(),
    phone: text(formData, "phone"),
    whatsapp: text(formData, "whatsapp"),
    gstin: text(formData, "gstin"),
    gstStateCode: text(formData, "gstStateCode"),
  });
  if (!parsed.success) return failed(parsed.error);
  const { gstin, ...rest } = parsed.data;
  if (gstin && gstin.slice(0, 2) !== rest.gstStateCode) return { status: "error", message: `A GSTIN starting with ${gstin.slice(0, 2)} belongs to another state than the one chosen.` };
  await settingsUpdate({ ...rest, gstin: gstin || null }, user.id);
  refreshStorefront("settings");
  return { status: "saved", message: "Saved." };
}

// ─── Shop address ──────────────────────────────────────────────────────────────

const addressSchema = z.object({
  line1: z.string().trim().min(3, "Enter the street address.").max(120),
  line2: z.string().trim().max(120),
  landmark: z.string().trim().max(80),
  city: z.string().trim().min(2, "Enter the town or city.").max(60),
  stateCode: z.string().refine((code) => stateName(code) !== null, "Choose the state."),
  pinCode: z.string().refine(isValidPin, "Enter the 6-digit PIN code."),
  phone: z.string().transform((value, context) => shopPhone(value) ?? (context.addIssue({ code: "custom", message: "Enter the shop phone with its 10 digits." }), z.NEVER)),
  mapUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "The map link must start with https://." })]),
});

export async function saveShopAddress(_state: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("settings.manage");
  const parsed = addressSchema.safeParse({
    line1: text(formData, "line1"),
    line2: text(formData, "line2"),
    landmark: text(formData, "landmark"),
    city: text(formData, "city"),
    stateCode: text(formData, "stateCode"),
    pinCode: text(formData, "pinCode"),
    phone: text(formData, "phone"),
    mapUrl: text(formData, "mapUrl"),
  });
  if (!parsed.success) return failed(parsed.error);
  const { line2, landmark, mapUrl, ...rest } = parsed.data;
  const data = { ...rest, line2: line2 || null, landmark: landmark || null, mapUrl: mapUrl || null, state: stateName(rest.stateCode)!, contentUpdatedAt: new Date() };
  const location = await prisma.storeLocation.findFirst({ where: { storeId: DEFAULT_STORE_ID }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], select: { id: true } });
  if (location) await prisma.storeLocation.update({ where: { id: location.id }, data });
  else await prisma.storeLocation.create({ data: { storeId: DEFAULT_STORE_ID, name: "Main shop", slug: "main", isPrimary: true, openingHours: [], ...data } });
  refreshStorefront("locations", "settings");
  return { status: "saved", message: "Saved. The contact page, footer and invoices use the new address." };
}

// ─── Delivery and cash on delivery ─────────────────────────────────────────────

const deliverySchema = z.object({
  freeShippingThreshold: rupeesOrEmpty("Free delivery from"),
  dispatchCutoffHour: wholeNumber("The order cut-off hour", 0, 23),
  processingDays: wholeNumber("Packing days", 0, 10),
  codEnabled: z.boolean(),
  codFee: rupeesOrEmpty("The COD fee"),
  codMinOrder: rupeesOrEmpty("The COD minimum"),
  codMaxOrder: rupeesOrEmpty("The COD maximum"),
});

export async function saveDelivery(_state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("settings.manage");
  const parsed = deliverySchema.safeParse({
    freeShippingThreshold: text(formData, "freeShippingThreshold"),
    dispatchCutoffHour: text(formData, "dispatchCutoffHour"),
    processingDays: text(formData, "processingDays"),
    codEnabled: checked(formData, "codEnabled"),
    codFee: text(formData, "codFee"),
    codMinOrder: text(formData, "codMinOrder"),
    codMaxOrder: text(formData, "codMaxOrder"),
  });
  if (!parsed.success) return failed(parsed.error);
  const input = parsed.data;
  if (input.codMinOrder !== null && input.codMaxOrder !== null && input.codMinOrder >= input.codMaxOrder) {
    return { status: "error", message: "The COD maximum must be higher than the minimum." };
  }

  // Delivery charges and times per zone.
  const rates = await prisma.shippingRate.findMany({ where: { storeId: DEFAULT_STORE_ID }, include: { zone: { select: { name: true } } } });
  const errors: string[] = [];
  const updates = rates.map((rate) => {
    const price = parseRupees(text(formData, `rate-price-${rate.id}`) || "0");
    const minDays = Number(text(formData, `rate-min-${rate.id}`));
    const maxDays = Number(text(formData, `rate-max-${rate.id}`));
    if (price === null) errors.push(`${rate.zone.name}: the charge must be an amount in rupees.`);
    if (!Number.isInteger(minDays) || !Number.isInteger(maxDays) || minDays < 0 || maxDays < minDays || maxDays > 30) {
      errors.push(`${rate.zone.name}: delivery days must be whole numbers, the second at least the first.`);
    }
    return { id: rate.id, data: { price: price ?? 0, minDays, maxDays, codAvailable: checked(formData, `rate-cod-${rate.id}`) } };
  });
  if (errors.length) return { status: "error", message: "Please fix the following:", errors };

  await prisma.$transaction([
    prisma.storeSettings.update({
      where: { storeId: DEFAULT_STORE_ID },
      data: { ...input, codFee: input.codFee ?? 0, updatedById: user.id },
    }),
    ...updates.map((update) => prisma.shippingRate.update({ where: { id: update.id }, data: update.data })),
  ]);
  refreshStorefront("settings", "shipping");
  return { status: "saved", message: "Saved. Bags and checkout use the new charges now." };
}

// ─── Returns, stock, announcement, invoices ────────────────────────────────────

export async function saveReturns(_state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("settings.manage");
  const parsed = z
    .object({ returnsEnabled: z.boolean(), exchangesEnabled: z.boolean(), returnWindowDays: wholeNumber("The return window", 0, 60), lowStockThreshold: wholeNumber("Low stock", 0, 1000) })
    .safeParse({
      returnsEnabled: checked(formData, "returnsEnabled"),
      exchangesEnabled: checked(formData, "exchangesEnabled"),
      returnWindowDays: text(formData, "returnWindowDays"),
      lowStockThreshold: text(formData, "lowStockThreshold"),
    });
  if (!parsed.success) return failed(parsed.error);
  await settingsUpdate(parsed.data, user.id);
  refreshStorefront("settings", "products");
  return { status: "saved", message: "Saved." };
}

export async function saveAnnouncement(_state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("settings.manage");
  const parsed = z
    .object({
      announcementEnabled: z.boolean(),
      announcementText: z.string().trim().max(140, "Keep the announcement under 140 characters so it fits on a phone."),
      announcementHref: z.union([z.literal(""), z.string().regex(/^\/(?!\/)\S*$|^https:\/\/\S+$/, "The link must be a shop address like /sale, or start with https://.")]),
    })
    .safeParse({ announcementEnabled: checked(formData, "announcementEnabled"), announcementText: text(formData, "announcementText"), announcementHref: text(formData, "announcementHref") });
  if (!parsed.success) return failed(parsed.error);
  if (parsed.data.announcementEnabled && !parsed.data.announcementText) return { status: "error", message: "Write the announcement, or switch the bar off." };
  const current = await prisma.storeSettings.findUniqueOrThrow({ where: { storeId: DEFAULT_STORE_ID }, select: { announcementText: true } });
  await settingsUpdate(
    {
      ...parsed.data,
      announcementText: parsed.data.announcementText || null,
      announcementHref: parsed.data.announcementHref || null,
      // A new message shows again to shoppers who closed the old one.
      announcementVersion: parsed.data.announcementText !== current.announcementText ? { increment: 1 } : undefined,
    },
    user.id,
  );
  refreshStorefront("settings");
  return { status: "saved", message: "Saved." };
}

export async function saveInvoiceSettings(_state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("settings.manage");
  const prefix = text(formData, "invoicePrefix").toUpperCase();
  const footer = text(formData, "invoiceFooter");
  if (!/^[A-Z0-9]{1,8}$/.test(prefix)) return { status: "error", message: "The invoice prefix needs 1 to 8 letters or numbers." };
  if (footer.length > 300) return { status: "error", message: "Keep the invoice footer under 300 characters." };
  await settingsUpdate({ invoicePrefix: prefix, invoiceFooter: footer || null }, user.id);
  return { status: "saved", message: "Saved. New invoices use these." };
}

// ─── Demo data ─────────────────────────────────────────────────────────────────

/** Settings → Remove all demo data. Real orders, categories, pages and settings stay. */
export async function removeAllDemoData() {
  await requireStaff("settings.manage");
  const removed = await removeDemoData(prisma, DEFAULT_STORE_ID);
  for (const tag of ALL_TAGS) updateTag(tag);
  // The demo section disappears once the data is gone, so the result is shown at the top instead.
  const summary = [`${removed.products} products`, `${removed.orders} orders`, `${removed.customers} customers`, `${removed.brands} brands`].join(", ");
  redirect(`/admin/settings?demoRemoved=${encodeURIComponent(summary)}`);
}
