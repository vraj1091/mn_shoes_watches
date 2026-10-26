import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { buildCartView, emptyCart } from "@/lib/cart/cart";
import { listingFields } from "@/lib/catalog/listing";
import { estimateDelivery } from "@/lib/commerce/delivery";
import { isValidPin, stateName, STATES } from "@/lib/commerce/india";
import { getShippingZones } from "@/lib/data/commerce";
import { getStoreSettings } from "@/lib/data/store";
import { normaliseIndianMobile } from "@/lib/format/phone";
import { createRazorpayOrder, razorpayKeys, verifyRazorpaySignature } from "@/lib/payments/razorpay";

/*
 * Turns the bag into an order. Everything is recalculated on the server from current prices,
 * stock, coupon and delivery rules; the browser only sends who and where. Stock is taken inside
 * the same transaction as the order with a conditional update, so two shoppers can never buy the
 * last pair. Order numbers come from a counter in that transaction (DECISIONS.md 6).
 */

const stateCodes = new Set(STATES.map((state) => state.code));

export const checkoutSchema = z.object({
  email: z.email("email").max(160),
  phone: z.string().transform((value, ctx) => {
    const phone = normaliseIndianMobile(value);
    if (!phone) ctx.addIssue({ code: "custom", message: "phone" });
    return phone ?? "";
  }),
  name: z.string().trim().min(2, "name").max(80),
  line1: z.string().trim().min(3, "line1").max(120),
  line2: z.string().trim().max(120).optional().default(""),
  landmark: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().min(2, "city").max(60),
  stateCode: z.string().refine((code) => stateCodes.has(code), "stateCode"),
  pinCode: z.string().trim().refine(isValidPin, "pinCode"),
  paymentMethod: z.enum(["PREPAID", "COD"]),
  note: z.string().trim().max(300).optional().default(""),
  idempotencyKey: z.uuid(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export type PlaceOrderResult =
  | { ok: true; token: string; razorpay: { keyId: string; orderId: string; amount: number; name: string; email: string; contact: string; number: string } | null }
  | { ok: false; error: "INVALID"; fields: string[] }
  | { ok: false; error: "EMPTY" | "COD_UNAVAILABLE" | "PAYMENT" }
  | { ok: false; error: "STOCK"; items: string[] };

class StockError extends Error {
  constructor(readonly items: string[]) {
    super("stock");
  }
}

const orderNumber = (value: number) => `MN${10000 + value}`;

export async function placeOrder(tokenHash: string, raw: CheckoutInput): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "INVALID", fields: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? issue.message)))] };
  const input = parsed.data;

  // A double click or a retry after a network blip returns the order already placed.
  const repeat = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { publicToken: true, status: true } });
  if (repeat) return { ok: true, token: repeat.publicToken, razorpay: null };

  const [view, settings, zones] = await Promise.all([buildCartView(tokenHash, input.paymentMethod), getStoreSettings(), getShippingZones()]);
  const payable = view.lines.filter((line) => line.available);
  if (payable.length === 0) return { ok: false, error: "EMPTY" };
  const unavailable = view.lines.filter((line) => !line.available).map((line) => line.title);
  if (unavailable.length) return { ok: false, error: "STOCK", items: unavailable };

  const estimate = estimateDelivery(input.pinCode, new Date(), zones, { cutoffHour: settings.dispatchCutoffHour, holidays: [] });
  if (input.paymentMethod === "COD") {
    const allowed =
      settings.codEnabled &&
      (estimate?.codAvailable ?? true) &&
      (settings.codMaxOrder === null || view.totals.grandTotal <= settings.codMaxOrder) &&
      (settings.codMinOrder === null || view.totals.grandTotal >= settings.codMinOrder);
    if (!allowed) return { ok: false, error: "COD_UNAVAILABLE" };
  }

  const razorpay = input.paymentMethod === "PREPAID" ? razorpayKeys() : null;
  let razorpayOrderId: string | null = null;
  if (razorpay) {
    try {
      razorpayOrderId = await createRazorpayOrder(view.totals.grandTotal, input.idempotencyKey);
    } catch (error) {
      console.error("[checkout] Razorpay order failed", error);
      return { ok: false, error: "PAYMENT" };
    }
  }

  const cart = await prisma.cart.findUnique({ where: { tokenHash }, select: { id: true } });
  const now = new Date();
  const status = input.paymentMethod === "COD" || !razorpay ? "CONFIRMED" : "PENDING_PAYMENT";
  const paymentStatus = input.paymentMethod === "COD" ? "COD_PENDING" : razorpay ? "UNPAID" : "PAID";
  const address = {
    name: input.name,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 || null,
    landmark: input.landmark || null,
    city: input.city,
    state: stateName(input.stateCode)!,
    stateCode: input.stateCode,
    pinCode: input.pinCode,
  };

  try {
    const order = await prisma.$transaction(async (tx) => {
      for (const line of payable) {
        const taken = await tx.productVariant.updateMany({
          where: { id: line.variantId, isActive: true, stockOnHand: { gte: line.quantity } },
          data: { stockOnHand: { decrement: line.quantity } },
        });
        if (taken.count !== 1) throw new StockError([line.title]);
      }

      const counter = await tx.counter.upsert({
        where: { storeId_key: { storeId: DEFAULT_STORE_ID, key: "order" } },
        create: { storeId: DEFAULT_STORE_ID, key: "order", nextValue: 2 },
        update: { nextValue: { increment: 1 } },
      });
      const number = orderNumber(counter.nextValue - 1);

      const existing = await tx.customer.findUnique({ where: { email: input.email.toLowerCase() } });
      const customer =
        existing ??
        (await tx.customer.create({ data: { storeId: DEFAULT_STORE_ID, name: input.name, email: input.email.toLowerCase(), phone: input.phone } }));

      const created = await tx.order.create({
        data: {
          storeId: DEFAULT_STORE_ID,
          number,
          publicToken: randomBytes(18).toString("base64url"),
          customerId: customer.id,
          cartId: cart?.id,
          email: input.email.toLowerCase(),
          phone: input.phone,
          status,
          paymentStatus,
          paymentMethod: input.paymentMethod,
          subtotal: view.totals.subtotal,
          discountTotal: view.totals.discountTotal,
          shippingTotal: view.totals.shippingTotal,
          codFee: view.totals.codFee,
          taxTotal: view.totals.taxTotal,
          grandTotal: view.totals.grandTotal,
          couponCode: view.coupon && !view.coupon.problem ? view.coupon.code : null,
          shippingMethod: "Standard delivery",
          deliveryMinDate: estimate?.minDate,
          deliveryMaxDate: estimate?.maxDate,
          placeOfSupply: input.stateCode,
          customerNote: input.note || null,
          placedAt: status === "PENDING_PAYMENT" ? null : now,
          confirmedAt: status === "CONFIRMED" ? now : null,
          idempotencyKey: input.idempotencyKey,
          items: {
            create: payable.map((line, index) => ({
              storeId: DEFAULT_STORE_ID,
              productId: line.productId,
              variantId: line.variantId,
              productTitle: line.title,
              variantTitle: line.variantTitle,
              brandName: line.brand,
              sku: line.sku,
              imageKey: null,
              hsnCode: line.hsnCode,
              gstRateBp: line.rateBp,
              unitPrice: line.unitPrice,
              compareAtPrice: line.compareAtPrice,
              quantity: line.quantity,
              discountAmount: view.totals.lines[index]!.discount,
              lineTotal: view.totals.lines[index]!.lineTotal,
              taxableValue: view.totals.lines[index]!.taxable,
              taxAmount: view.totals.lines[index]!.tax,
            })),
          },
          addresses: { create: (["SHIPPING", "BILLING"] as const).map((type) => ({ storeId: DEFAULT_STORE_ID, type, ...address })) },
          events: {
            create: {
              storeId: DEFAULT_STORE_ID,
              type: "status_changed",
              message: status === "PENDING_PAYMENT" ? "Order created; waiting for online payment." : "Order placed.",
              actor: "CUSTOMER",
            },
          },
          payments: {
            create: {
              storeId: DEFAULT_STORE_ID,
              provider: input.paymentMethod === "COD" ? "COD" : razorpay ? "RAZORPAY" : "MANUAL",
              providerOrderId: razorpayOrderId,
              method: input.paymentMethod === "COD" ? "cod" : razorpay ? null : "demo",
              amount: view.totals.grandTotal,
              status: paymentStatus === "PAID" ? "CAPTURED" : "CREATED",
              capturedAt: paymentStatus === "PAID" ? now : null,
            },
          },
        },
      });

      for (const line of payable) {
        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: line.variantId }, select: { stockOnHand: true } });
        await tx.stockMovement.create({
          data: { storeId: DEFAULT_STORE_ID, variantId: line.variantId, delta: -line.quantity, balanceAfter: variant.stockOnHand, reason: "ORDER_PLACED", orderId: created.id },
        });
      }

      if (status !== "PENDING_PAYMENT") {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            orderCount: { increment: 1 },
            totalSpent: { increment: view.totals.grandTotal },
            firstOrderAt: customer.firstOrderAt ?? now,
            lastOrderAt: now,
            phone: customer.phone ?? input.phone,
          },
        });
      }
      if (created.couponCode) {
        await tx.discount.updateMany({ where: { storeId: DEFAULT_STORE_ID, code: created.couponCode }, data: { usageCount: { increment: 1 } } });
      }
      return created;
    });

    await refreshListingFields(payable.map((line) => line.productId));
    if (cart) await emptyCart(cart.id);

    return {
      ok: true,
      token: order.publicToken,
      razorpay:
        razorpay && razorpayOrderId
          ? { keyId: razorpay.keyId, orderId: razorpayOrderId, amount: order.grandTotal, name: settings.storeName, email: order.email, contact: order.phone, number: order.number }
          : null,
    };
  } catch (error) {
    if (error instanceof StockError) return { ok: false, error: "STOCK", items: error.items };
    throw error;
  }
}

/** Keeps the product's price range and "in stock" flag in step with its variants after a sale. */
export async function refreshListingFields(productIds: string[]) {
  for (const productId of new Set(productIds)) {
    const variants = await prisma.productVariant.findMany({ where: { productId }, select: { price: true, compareAtPrice: true, stockOnHand: true, isActive: true } });
    await prisma.product.update({ where: { id: productId }, data: listingFields(variants) });
  }
}

/** Confirms a Razorpay payment from the signature Razorpay Checkout hands back to the browser. */
export async function confirmRazorpayPayment(token: string, paymentId: string, signature: string): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { publicToken: token }, include: { payments: true } });
  const payment = order?.payments.find((entry) => entry.provider === "RAZORPAY" && entry.providerOrderId);
  if (!order || !payment) return false;
  if (order.paymentStatus === "PAID") return true;
  if (!verifyRazorpaySignature(payment.providerOrderId!, paymentId, signature)) return false;
  const now = new Date();
  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentId: paymentId, status: "CAPTURED", signatureVerified: true, capturedAt: now } }),
    prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", status: "CONFIRMED", placedAt: now, confirmedAt: now } }),
    prisma.orderEvent.create({ data: { storeId: DEFAULT_STORE_ID, orderId: order.id, type: "payment_captured", message: "Online payment received.", actor: "CUSTOMER" } }),
  ]);
  if (order.customerId) {
    await prisma.customer.update({
      where: { id: order.customerId },
      data: { orderCount: { increment: 1 }, totalSpent: { increment: order.grandTotal }, lastOrderAt: now },
    });
  }
  return true;
}
