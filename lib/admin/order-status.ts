/** Order statuses as staff see them, and which change can follow which. */

export type OrderStatusName =
  | "PENDING_PAYMENT"
  | "AWAITING_COD_CONFIRMATION"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED_TO_ORIGIN";

export const STATUS_LABELS: Record<OrderStatusName, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  AWAITING_COD_CONFIRMATION: "COD to confirm",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED_TO_ORIGIN: "Returned to shop",
};

export const STATUS_TONES: Record<OrderStatusName, "neutral" | "good" | "bad" | "info"> = {
  PENDING_PAYMENT: "neutral",
  AWAITING_COD_CONFIRMATION: "info",
  CONFIRMED: "info",
  PACKED: "info",
  SHIPPED: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "good",
  CANCELLED: "bad",
  RETURNED_TO_ORIGIN: "bad",
};

/** The next steps staff can take from each status; anything else is refused. */
export const NEXT_STATUSES: Record<OrderStatusName, OrderStatusName[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  AWAITING_COD_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED_TO_ORIGIN"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED_TO_ORIGIN"],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED_TO_ORIGIN: [],
};

/** Stock goes back on the shelf when an order is cancelled before it ships or comes back undelivered. */
export const RESTOCKS: OrderStatusName[] = ["CANCELLED", "RETURNED_TO_ORIGIN"];

export const PAYMENT_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  COD_PENDING: "COD due",
  COD_COLLECTED: "COD collected",
  FAILED: "Failed",
  PARTIALLY_REFUNDED: "Partly refunded",
  REFUNDED: "Refunded",
};
