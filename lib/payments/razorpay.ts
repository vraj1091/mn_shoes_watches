import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "@/lib/security/crypto";

/*
 * Razorpay in test or live mode, when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set. Without
 * them checkout offers "Online payment (demo)", which succeeds at once (DECISIONS.md 50).
 */

export function razorpayKeys(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}

/** Creates a Razorpay order for the amount in paise; the browser then opens Razorpay Checkout for it. */
export async function createRazorpayOrder(amount: number, receipt: string): Promise<string> {
  const keys = razorpayKeys();
  if (!keys) throw new Error("Razorpay is not configured");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "INR", receipt: receipt.slice(0, 40) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Razorpay order failed: ${response.status}`);
  const body = (await response.json()) as { id?: string };
  if (!body.id) throw new Error("Razorpay order has no id");
  return body.id;
}

/** Razorpay signs "order_id|payment_id" with the key secret; anything else is not a real payment. */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const keys = razorpayKeys();
  if (!keys) return false;
  const expected = createHmac("sha256", keys.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}
