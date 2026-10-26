"use server";

import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { requireStaff } from "@/lib/auth/session";
import { NEXT_STATUSES, RESTOCKS, STATUS_LABELS, type OrderStatusName } from "@/lib/admin/order-status";
import { refreshStorefront } from "@/lib/admin/refresh";
import { refreshListingFields } from "@/lib/orders/place";
import { issueInvoice } from "@/lib/admin/invoice";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/admin/forms";

const statusSchema = z.enum(Object.keys(STATUS_LABELS) as [OrderStatusName, ...OrderStatusName[]]);

const SHIPMENT_STATUS: Partial<Record<OrderStatusName, "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RTO_DELIVERED">> = {
  SHIPPED: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  RETURNED_TO_ORIGIN: "RTO_DELIVERED",
};

/**
 * Moves an order to its next status. Only the steps in NEXT_STATUSES are allowed. Cancelling, or
 * a parcel coming back undelivered, puts the stock back; delivering a COD order marks it collected.
 */
export async function changeOrderStatus(orderId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("orders.manage");
  const parsed = z
    .object({
      status: statusSchema,
      note: z.string().trim().max(500).optional(),
      courier: z.string().trim().max(80).optional(),
      awb: z.string().trim().max(40).optional(),
      trackingUrl: z.url({ protocol: /^https?$/ }).optional(),
    })
    .safeParse({
      status: formData.get("status"),
      note: formData.get("note") || undefined,
      courier: formData.get("courier") || undefined,
      awb: formData.get("awb") || undefined,
      trackingUrl: formData.get("trackingUrl") || undefined,
    });
  if (!parsed.success) {
    const tracking = parsed.error.issues.some((issue) => issue.path[0] === "trackingUrl");
    return { status: "error", message: tracking ? "The tracking link must start with https://." : "Choose a status." };
  }
  const next = parsed.data.status;

  const order = await prisma.order.findFirst({ where: { id: orderId, storeId: DEFAULT_STORE_ID }, include: { items: true, payments: true, shipments: true } });
  if (!order) return { status: "error", message: "This order no longer exists." };
  const current = order.status as OrderStatusName;
  if (!NEXT_STATUSES[current].includes(next)) {
    return { status: "error", message: `An order that is "${STATUS_LABELS[current]}" cannot become "${STATUS_LABELS[next]}".` };
  }

  const now = new Date();
  const paidOnline = order.paymentStatus === "PAID";
  const manualPayment = order.payments.some((payment) => payment.provider === "MANUAL");
  await prisma.$transaction(async (tx) => {
    if (RESTOCKS.includes(next)) {
      // The customer never kept these goods, so they no longer count towards what they spent.
      // Unpaid online orders (no placedAt) were never counted.
      if (order.customerId && order.placedAt) {
        const customer = await tx.customer.findUnique({ where: { id: order.customerId }, select: { totalSpent: true } });
        if (customer) await tx.customer.update({ where: { id: order.customerId }, data: { totalSpent: Math.max(0, customer.totalSpent - order.grandTotal) } });
      }
      for (const item of order.items) {
        if (!item.variantId) continue;
        const variant = await tx.productVariant.update({ where: { id: item.variantId }, data: { stockOnHand: { increment: item.quantity } } }).catch(() => null);
        if (variant) {
          await tx.stockMovement.create({
            data: { storeId: DEFAULT_STORE_ID, variantId: item.variantId, delta: item.quantity, balanceAfter: variant.stockOnHand, reason: "ORDER_CANCELLED", orderId: order.id, staffId: user.id },
          });
        }
      }
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: next,
        confirmedAt: next === "CONFIRMED" ? now : undefined,
        deliveredAt: next === "DELIVERED" ? now : undefined,
        cancelledAt: next === "CANCELLED" ? now : undefined,
        cancelReason: next === "CANCELLED" ? (parsed.data.note ?? null) : undefined,
        placedAt: next === "CONFIRMED" && !order.placedAt ? now : undefined,
        paymentStatus:
          next === "DELIVERED" && order.paymentMethod === "COD"
            ? "COD_COLLECTED"
            : next === "CANCELLED" && paidOnline && manualPayment
              ? "REFUNDED"
              : undefined,
        amountRefunded: next === "CANCELLED" && paidOnline && manualPayment ? order.grandTotal : undefined,
      },
    });
    const shipment = order.shipments.find((entry) => entry.direction === "FORWARD");
    const shipmentStatus = SHIPMENT_STATUS[next];
    if (next === "SHIPPED" && !shipment) {
      await tx.shipment.create({
        data: {
          storeId: DEFAULT_STORE_ID,
          orderId: order.id,
          provider: "MANUAL",
          courierName: parsed.data.courier ?? null,
          awb: parsed.data.awb ?? null,
          trackingUrl: parsed.data.trackingUrl ?? null,
          status: "IN_TRANSIT",
          pickedUpAt: now,
          expectedDeliveryAt: order.deliveryMaxDate,
        },
      });
    } else if (shipment && shipmentStatus) {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: shipmentStatus,
          deliveredAt: next === "DELIVERED" ? now : undefined,
          courierName: parsed.data.courier ?? undefined,
          awb: parsed.data.awb ?? undefined,
          trackingUrl: parsed.data.trackingUrl ?? undefined,
        },
      });
    }
    await tx.orderEvent.create({
      data: {
        storeId: DEFAULT_STORE_ID,
        orderId: order.id,
        type: "status_changed",
        message: `${STATUS_LABELS[next]}.${parsed.data.note ? ` ${parsed.data.note}` : ""}`,
        actor: "STAFF",
        staffId: user.id,
      },
    });
    if (next === "CANCELLED" && paidOnline && !manualPayment) {
      await tx.orderEvent.create({
        data: { storeId: DEFAULT_STORE_ID, orderId: order.id, type: "note", message: "Refund this payment from the Razorpay dashboard.", actor: "SYSTEM", isInternal: true },
      });
    }
  });

  if (RESTOCKS.includes(next)) {
    await refreshListingFields(order.items.flatMap((item) => (item.productId ? [item.productId] : [])));
    refreshStorefront("products");
  }
  return { status: "saved", message: `Marked as ${STATUS_LABELS[next].toLowerCase()}.` };
}

/** An internal note on the order timeline; customers never see it. */
export async function addOrderNote(orderId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("orders.manage");
  const note = String(formData.get("note") ?? "").trim();
  if (note.length < 2 || note.length > 1000) return { status: "error", message: "Write a note of 2 to 1,000 characters." };
  const order = await prisma.order.findFirst({ where: { id: orderId, storeId: DEFAULT_STORE_ID }, select: { id: true } });
  if (!order) return { status: "error", message: "This order no longer exists." };
  await prisma.orderEvent.create({ data: { storeId: DEFAULT_STORE_ID, orderId, type: "note", message: note, actor: "STAFF", staffId: user.id, isInternal: true } });
  return { status: "saved", message: "Note added." };
}

/** Issues the GST tax invoice (once) and opens it. */
export async function createInvoice(orderId: string) {
  await requireStaff("orders.manage");
  const order = await prisma.order.findFirst({ where: { id: orderId, storeId: DEFAULT_STORE_ID }, select: { status: true } });
  if (!order || order.status === "PENDING_PAYMENT" || order.status === "CANCELLED") return { ok: false, message: "Only confirmed orders get a tax invoice." };
  await issueInvoice(orderId);
  redirect(`/admin/orders/${orderId}/invoice`);
}
