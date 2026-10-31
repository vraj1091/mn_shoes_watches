import "server-only";
import { prisma } from "@/lib/db/client";
import { rateLimit } from "@/lib/security/rate-limit";
import { CODE_RESEND_SECONDS, codeCooldownKey, EMAIL_PATTERN } from "./customer-rules";
import { emailAccountCode, getCustomerAuth } from "./customer";

export type CodePurposeInput = "sign-in" | "sign-up" | "reset";

export type CodeSendResult =
  | { ok: true; resendAfter: number }
  | { ok: false; error: "INVALID_EMAIL" | "WAIT" | "BUSY" | "EMAIL_FAILED"; retryAfter?: number };

const OTP_TYPE = { "sign-in": "sign-in", "sign-up": "sign-in", reset: "forget-password" } as const;

/**
 * Creates a 6-digit code and emails it, waiting for the email so a failure reaches the shopper
 * instead of disappearing into a log (DECISIONS.md 65). One code per email per minute; a new code
 * replaces the previous one. Codes are checked by Better Auth (5 tries, 10 minutes).
 *
 * A reset code is only sent to an email that has a customer record; the reply is the same either
 * way, so the form does not reveal who shops here.
 */
export async function sendAccountCode(rawEmail: string, purpose: CodePurposeInput, ip: string): Promise<CodeSendResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 160) return { ok: false, error: "INVALID_EMAIL" };

  const perIp = await rateLimit(`code-ip:${ip}`, { windowSeconds: 60, max: 15 });
  if (!perIp.ok) return { ok: false, error: "BUSY", retryAfter: perIp.retryAfterSeconds };
  // One code a minute per email and kind of code (a sign-up code does not hold up a reset code).
  const type = OTP_TYPE[purpose];
  const perEmail = await rateLimit(codeCooldownKey(type, email), { windowSeconds: CODE_RESEND_SECONDS, max: 1 });
  if (!perEmail.ok) return { ok: false, error: "WAIT", retryAfter: perEmail.retryAfterSeconds };

  if (purpose === "reset" && !(await prisma.customer.findUnique({ where: { email }, select: { id: true } }))) {
    return { ok: true, resendAfter: CODE_RESEND_SECONDS };
  }

  const identifier = `${type}-otp-${email}`;
  await prisma.customerVerification.deleteMany({ where: { identifier } });
  const code = await getCustomerAuth().api.createVerificationOTP({ body: { email, type } });
  try {
    await emailAccountCode(email, code, purpose);
  } catch (error) {
    console.error(`[auth] could not email a ${purpose} code to ${email}`, error);
    // No code went out, so neither the code nor the one-minute wait should stand.
    await prisma.customerVerification.deleteMany({ where: { identifier } });
    await prisma.rateLimit.deleteMany({ where: { key: codeCooldownKey(type, email) } });
    return { ok: false, error: "EMAIL_FAILED" };
  }
  return { ok: true, resendAfter: CODE_RESEND_SECONDS };
}
