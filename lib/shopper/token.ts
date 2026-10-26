import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { sha256Hex } from "@/lib/security/crypto";

/*
 * One random token per browser identifies the shopper's bag and wishlist without an account
 * (DECISIONS.md 17). Only its SHA-256 is stored, so a database copy cannot be used to read or
 * change anyone's bag.
 */

export const SHOPPER_COOKIE = "mn-shopper";
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** The shopper's token hash, or null when this browser has no bag or wishlist yet. */
export async function readShopperHash(): Promise<string | null> {
  const token = (await cookies()).get(SHOPPER_COOKIE)?.value;
  return token && TOKEN.test(token) ? sha256Hex(token) : null;
}

/** Server actions only: the token hash, creating the cookie on the first add to bag or wishlist. */
export async function ensureShopperHash(): Promise<string> {
  const store = await cookies();
  let token = store.get(SHOPPER_COOKIE)?.value;
  if (!token || !TOKEN.test(token)) {
    token = randomBytes(32).toString("base64url");
    store.set(SHOPPER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return sha256Hex(token);
}
