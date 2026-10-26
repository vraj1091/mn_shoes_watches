import "server-only";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { env } from "@/lib/env";
import { hasDemoData } from "@/lib/demo/remove";
import { razorpayKeys } from "@/lib/payments/razorpay";

/** Seed values are written in [square brackets] or as zeros, so they are easy to spot and to detect. */
export const isPlaceholder = (value: string | null | undefined) =>
  !value || /^\[.*\]$/.test(value.trim()) || /0{5}\s?0{5}/.test(value);

export type ChecklistItem = { id: string; label: string; detail: string; done: boolean };

/**
 * What still has to happen before the shop takes real orders. Read live from the database, so
 * an item ticks itself off once the owner fills it in.
 */
export async function getSetupChecklist(staff: { twoFactorEnabled: boolean }): Promise<ChecklistItem[]> {
  const [settings, location, taxClasses, demo] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { storeId: DEFAULT_STORE_ID } }),
    prisma.storeLocation.findFirst({ where: { storeId: DEFAULT_STORE_ID, isPrimary: true } }),
    prisma.taxClass.findMany({ where: { storeId: DEFAULT_STORE_ID }, select: { verifiedAt: true } }),
    hasDemoData(prisma),
  ]);
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = env();

  return [
    {
      id: "two-factor",
      label: "Turn on two-factor sign-in",
      detail: "Protects the admin with a code from an authenticator app on your phone.",
      done: staff.twoFactorEnabled,
    },
    {
      id: "contact",
      label: "Shop phone and WhatsApp number",
      detail: "Shown in the header, footer, order emails and Google's shop listing.",
      done: !isPlaceholder(settings?.phone) && !isPlaceholder(settings?.whatsapp),
    },
    {
      id: "address",
      label: "Shop address, PIN code and map link",
      detail: "Must match your Google Business Profile word for word.",
      done: Boolean(location && !isPlaceholder(location.line1) && !isPlaceholder(location.pinCode) && location.mapUrl),
    },
    {
      id: "gstin",
      label: "GSTIN",
      detail: "Printed on every tax invoice.",
      done: !isPlaceholder(settings?.gstin),
    },
    {
      id: "tax",
      label: "GST rates checked with your accountant",
      detail: "The sample rates and HSN codes are starting points only.",
      done: taxClasses.length > 0 && taxClasses.every((taxClass) => taxClass.verifiedAt !== null),
    },
    {
      id: "email",
      label: "Email sending (SMTP)",
      detail: "Needed for sign-in codes and order emails. Add the SMTP details from your hosting panel.",
      done: Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD),
    },
    {
      id: "payments",
      label: "Online payments (Razorpay)",
      detail: "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET. Until then checkout offers a demo payment that charges nothing.",
      done: razorpayKeys() !== null,
    },
    {
      id: "demo",
      label: "Remove the demo data",
      detail: "Demo products, brands, photos, orders and customers. Settings → Remove all demo data.",
      done: !demo,
    },
  ];
}
