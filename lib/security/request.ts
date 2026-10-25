import "server-only";
import { headers } from "next/headers";

/**
 * The visitor's IP as reported by the host's proxy. Hostinger, cPanel/Passenger and Nginx all
 * put it first in X-Forwarded-For. Used only for rate limits, never stored in plain form.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}
