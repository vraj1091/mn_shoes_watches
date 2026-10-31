"use server";

import { after } from "next/server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";
import { addItem, buildCartView, setCartPin, setCoupon, setQuantity, type CartView } from "@/lib/cart/cart";
import { toggleWishlistItem, wishlistIds } from "@/lib/cart/wishlist";
import { estimateDelivery } from "@/lib/commerce/delivery";
import { isValidPin, stateCodeForPin, stateName } from "@/lib/commerce/india";
import { getShippingZones } from "@/lib/data/commerce";
import { findOrderForTracking } from "@/lib/data/orders";
import { getStoreSettings } from "@/lib/data/store";
import { formatDeliveryDay } from "@/lib/format/date";
import { normaliseIndianMobile } from "@/lib/format/phone";
import { sendEmail } from "@/lib/messaging/email";
import { orderConfirmationEmail } from "@/lib/messaging/order-email";
import { confirmRazorpayPayment, placeOrder, type CheckoutInput, type PlaceOrderResult } from "@/lib/orders/place";
import { getCustomerSession } from "@/lib/auth/session";
import { clientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";
import { ensureShopperHash, readShopperHash } from "@/lib/shopper/token";

/*
 * Server actions behind the bag, wishlist, delivery check, checkout and order tracking. Every one
 * recalculates from the database and returns fresh data, so the browser never decides a price.
 */

async function limited(name: string, max: number, windowSeconds = 60) {
  const result = await rateLimit(`${name}:${await clientIp()}`, { windowSeconds, max });
  return !result.ok;
}

const variantId = z.string().min(1).max(64);

// ─── Bag ─────────────────────────────────────────────────────────────────────

export async function getCart(): Promise<CartView> {
  return buildCartView(await readShopperHash());
}

export type CartActionResult = { ok: true; cart: CartView } | { ok: false; reason: "NOT_FOUND" | "SOLD_OUT" | "LIMIT" | "BUSY"; cart: CartView };

export async function addToCart(input: { variantId: string; quantity?: number }): Promise<CartActionResult> {
  const parsed = z.object({ variantId, quantity: z.number().int().min(1).max(5).optional() }).parse(input);
  const hash = await ensureShopperHash();
  if (await limited("cart", 60)) return { ok: false, reason: "BUSY", cart: await buildCartView(hash) };
  const change = await addItem(hash, parsed.variantId, parsed.quantity ?? 1);
  const cart = await buildCartView(hash);
  return change.ok ? { ok: true, cart } : { ok: false, reason: change.reason, cart };
}

export async function updateCartItem(input: { variantId: string; quantity: number }): Promise<CartActionResult> {
  const parsed = z.object({ variantId, quantity: z.number().int().min(0).max(5) }).parse(input);
  const hash = await readShopperHash();
  if (!hash) return { ok: false, reason: "NOT_FOUND", cart: await buildCartView(null) };
  const change = await setQuantity(hash, parsed.variantId, parsed.quantity);
  const cart = await buildCartView(hash);
  return change.ok ? { ok: true, cart } : { ok: false, reason: change.reason, cart };
}

export async function applyCoupon(code: string | null): Promise<{ status: "APPLIED" | "REMOVED" | "INVALID" | "BUSY"; cart: CartView }> {
  const hash = await ensureShopperHash();
  if (code !== null && (await limited("coupon", 20))) return { status: "BUSY", cart: await buildCartView(hash) };
  const status = await setCoupon(hash, code === null ? null : String(code).slice(0, 40));
  return { status, cart: await buildCartView(hash) };
}

// ─── Delivery estimate ───────────────────────────────────────────────────────

export type DeliveryCheck =
  | { ok: true; pin: string; place: string | null; from: string; to: string; cod: boolean; shipping: number; freeAbove: number | null }
  | { ok: false; reason: "INVALID" | "UNSERVICEABLE" | "BUSY" };

export async function checkDelivery(pin: string): Promise<DeliveryCheck> {
  const value = String(pin).trim();
  if (!isValidPin(value)) return { ok: false, reason: "INVALID" };
  if (await limited("pin", 60)) return { ok: false, reason: "BUSY" };
  const [zones, settings] = await Promise.all([getShippingZones(), getStoreSettings()]);
  const estimate = estimateDelivery(value, new Date(), zones, { cutoffHour: settings.dispatchCutoffHour, holidays: [] });
  if (!estimate) return { ok: false, reason: "UNSERVICEABLE" };
  // Remembered on the bag so its delivery charge uses this zone.
  const hash = await readShopperHash();
  if (hash) await setCartPin(hash, value);
  const code = stateCodeForPin(value);
  return {
    ok: true,
    pin: value,
    place: code ? stateName(code) : null,
    from: formatDeliveryDay(estimate.minDate),
    to: formatDeliveryDay(estimate.maxDate),
    cod: settings.codEnabled && estimate.codAvailable,
    shipping: estimate.shippingPrice,
    freeAbove: settings.freeShippingThreshold,
  };
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export async function getCheckoutTotals(paymentMethod: "PREPAID" | "COD"): Promise<CartView> {
  return buildCartView(await readShopperHash(), paymentMethod === "COD" ? "COD" : "PREPAID");
}

async function sendConfirmation(token: string) {
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({ where: { publicToken: token }, include: { items: true } }),
    getStoreSettings(),
  ]);
  if (!order) return;
  const base = process.env.APP_URL ?? "http://localhost:3001";
  try {
    await sendEmail(orderConfirmationEmail(order, settings.storeName, `${base}/order/${token}`));
  } catch (error) {
    console.error(`[order] confirmation email for ${order.number} not sent`, error);
  }
}

export async function submitOrder(input: CheckoutInput): Promise<PlaceOrderResult | { ok: false; error: "BUSY" }> {
  if (await limited("checkout", 10)) return { ok: false, error: "BUSY" };
  const hash = await readShopperHash();
  if (!hash) return { ok: false, error: "EMPTY" };
  const session = await getCustomerSession();
  const result = await placeOrder(hash, input, session?.user.id ?? null);
  if (result.ok) {
    // Stock and "only N left" changed; listings show it on the next request.
    updateTag(tags.products);
    if (!result.razorpay) after(() => sendConfirmation(result.token));
  }
  return result;
}

export async function confirmPayment(input: { token: string; paymentId: string; signature: string }): Promise<{ ok: boolean }> {
  const parsed = z.object({ token: z.string().max(64), paymentId: z.string().max(64), signature: z.string().max(128) }).parse(input);
  const ok = await confirmRazorpayPayment(parsed.token, parsed.paymentId, parsed.signature);
  if (ok) after(() => sendConfirmation(parsed.token));
  return { ok };
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export async function getWishlist(): Promise<string[]> {
  return wishlistIds(await readShopperHash());
}

export async function toggleWishlist(productId: string): Promise<{ ids: string[]; added: boolean }> {
  const id = z.string().min(1).max(64).parse(productId);
  const hash = await ensureShopperHash();
  if (await limited("wishlist", 60)) return { ids: await wishlistIds(hash), added: false };
  const added = await toggleWishlistItem(hash, id);
  return { ids: await wishlistIds(hash), added };
}

// ─── Order tracking ──────────────────────────────────────────────────────────

export type TrackState =
  | { status: "idle" | "invalid" | "busy" | "not-found" }
  | {
      status: "found";
      order: {
        number: string;
        token: string;
        status: string;
        placedAt: Date | null;
        deliveryMinDate: Date | null;
        deliveryMaxDate: Date | null;
        items: { title: string; variant: string | null; quantity: number }[];
        timeline: { label: string; at: Date }[];
        courier: { name: string | null; awb: string | null } | null;
      };
    };

export async function trackOrder(_previous: TrackState, formData: FormData): Promise<TrackState> {
  const number = String(formData.get("order") ?? "").trim();
  const phone = normaliseIndianMobile(String(formData.get("phone") ?? ""));
  if (!/^MN[D]?\d{4,7}$/i.test(number) || !phone) return { status: "invalid" };
  if (await limited("track", 10)) return { status: "busy" };
  const order = await findOrderForTracking(number, phone);
  if (!order) return { status: "not-found" };
  const shipment = order.shipments[0];
  return {
    status: "found",
    order: {
      number: order.number,
      token: order.publicToken,
      status: order.status,
      placedAt: order.placedAt,
      deliveryMinDate: order.deliveryMinDate,
      deliveryMaxDate: order.deliveryMaxDate,
      items: order.items.map((item) => ({ title: item.productTitle, variant: item.variantTitle, quantity: item.quantity })),
      timeline: [
        ...order.events.map((event) => ({ label: event.message, at: event.createdAt })),
        ...(shipment?.events ?? []).map((event) => ({ label: [event.rawStatus, event.location].filter(Boolean).join(", "), at: event.occurredAt })),
      ].sort((a, b) => a.at.getTime() - b.at.getTime()),
      courier: shipment ? { name: shipment.courierName, awb: shipment.awb } : null,
    },
  };
}

// ─── Contact form ────────────────────────────────────────────────────────────

export type ContactState = { status: "idle" | "done" | "invalid" | "busy" };

export async function sendContactMessage(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      contact: z.string().trim().min(5).max(160),
      message: z.string().trim().min(5).max(2000),
    })
    .safeParse({ name: formData.get("name"), contact: formData.get("contact"), message: formData.get("message") });
  if (!parsed.success) return { status: "invalid" };
  if (await limited("contact", 5, 600)) return { status: "busy" };
  const isEmail = parsed.data.contact.includes("@");
  await prisma.contactMessage.create({
    data: {
      storeId: DEFAULT_STORE_ID,
      name: parsed.data.name,
      email: isEmail ? parsed.data.contact : null,
      phone: isEmail ? null : (normaliseIndianMobile(parsed.data.contact) ?? parsed.data.contact),
      message: parsed.data.message,
    },
  });
  return { status: "done" };
}
