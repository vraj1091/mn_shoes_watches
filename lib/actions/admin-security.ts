"use server";

import QRCode from "qrcode";
import { requireStaff } from "@/lib/auth/session";

/**
 * Turns the authenticator link from Better Auth into a QR code. Done on the server so the QR
 * library never ships to the browser. Only signed-in staff can call it, for an otpauth link only.
 */
export async function totpQrCode(totpUri: string): Promise<string> {
  await requireStaff(undefined, { allowWithoutTwoFactor: true });
  if (!totpUri.startsWith("otpauth://totp/") || totpUri.length > 512) throw new Error("Not an authenticator link");
  // Dark-on-light keeps the code scannable in dark mode too.
  return QRCode.toString(totpUri, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1f1a17", light: "#f8f6f2" },
  });
}
