import "server-only";
import { resolve } from "@/lib/design/tokens";
import { formatPrice } from "@/lib/format/money";
import { formatDeliveryDay } from "@/lib/format/date";
import type { Email } from "./email";

// Email clients ignore CSS variables, so the light-mode token values are inlined.
const colour = resolve("light");

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type OrderForEmail = {
  number: string;
  email: string;
  grandTotal: number;
  paymentMethod: "PREPAID" | "COD";
  deliveryMinDate: Date | null;
  deliveryMaxDate: Date | null;
  items: { productTitle: string; variantTitle: string | null; quantity: number; lineTotal: number }[];
};

/** Plain, readable confirmation: what was ordered, what it cost, how to pay and when it arrives. */
export function orderConfirmationEmail(order: OrderForEmail, storeName: string, orderUrl: string): Email {
  const delivery =
    order.deliveryMinDate && order.deliveryMaxDate
      ? `Expected delivery: ${formatDeliveryDay(order.deliveryMinDate)} to ${formatDeliveryDay(order.deliveryMaxDate)}.`
      : "";
  const pay = order.paymentMethod === "COD" ? `Please keep ${formatPrice(order.grandTotal)} ready to pay the courier in cash or by UPI.` : "Your payment has been received.";
  const rows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${colour.line}">${escape(item.productTitle)}${item.variantTitle ? `<br><span style="color:${colour.muted}">${escape(item.variantTitle)}</span>` : ""} × ${item.quantity}</td><td style="padding:8px 0;border-bottom:1px solid ${colour.line};text-align:right">${formatPrice(item.lineTotal)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:${colour.surface};color:${colour.ink};font-family:Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px;background:${colour.canvas}">
<p style="margin:0;color:${colour.muted};font-size:14px">${escape(storeName)}</p>
<h1 style="font-size:22px;margin:16px 0 8px">Thank you. Order ${escape(order.number)} is confirmed.</h1>
<p style="margin:0 0 16px">${pay} ${delivery}</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
<tr><td style="padding:12px 0;font-weight:bold">Total, incl. GST</td><td style="padding:12px 0;font-weight:bold;text-align:right">${formatPrice(order.grandTotal)}</td></tr></table>
<p style="margin:24px 0 0"><a href="${escape(orderUrl)}" style="color:${colour.link}">View your order</a></p>
</div></body></html>`;
  const text = [
    `${storeName}: order ${order.number} is confirmed.`,
    pay,
    delivery,
    ...order.items.map((item) => `${item.productTitle}${item.variantTitle ? ` (${item.variantTitle})` : ""} × ${item.quantity}: ${formatPrice(item.lineTotal)}`),
    `Total, incl. GST: ${formatPrice(order.grandTotal)}`,
    `View your order: ${orderUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { to: order.email, subject: `Order ${order.number} confirmed`, html, text };
}
