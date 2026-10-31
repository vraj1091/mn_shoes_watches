"use server";

import { headers } from "next/headers";
import { isAPIError } from "better-auth/api";
import { prisma } from "@/lib/db/client";
import { sendAccountCode, type CodeSendResult } from "@/lib/auth/account-codes";
import { getCustomerAuth } from "@/lib/auth/customer";
import { cleanCode, validateSignUp, type SignUpField, type SignUpInput, type SignUpProblem } from "@/lib/auth/customer-rules";
import { hashPassword } from "@/lib/auth/password";
import { clientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";

/*
 * Customer account actions. Sign-up is two steps and saves nothing until the second: the form is
 * checked and a code is emailed; then the code is checked and the account, password, name and
 * phone are saved together (DECISIONS.md 64). Password sign-in, code sign-in and password reset
 * use Better Auth's own endpoints from the browser, which carry its rate limits.
 */

export type StartSignUpResult = { ok: true; email: string; resendAfter: number } | { ok: false; fields?: Partial<Record<SignUpField, SignUpProblem>>; error?: Exclude<CodeSendResult, { ok: true }>["error"]; retryAfter?: number };

export async function startSignUp(input: SignUpInput): Promise<StartSignUpResult> {
  const { values, errors } = validateSignUp(input);
  if (Object.keys(errors).length) return { ok: false, fields: errors };
  const sent = await sendAccountCode(values.email, "sign-up", await clientIp());
  if (!sent.ok) return { ok: false, error: sent.error, retryAfter: sent.retryAfter };
  return { ok: true, email: values.email, resendAfter: sent.resendAfter };
}

/** Sends (or resends) a code for signing in, finishing sign-up, or setting a new password. */
export async function requestAccountCode(input: { email: string; purpose: "sign-in" | "sign-up" | "reset" }): Promise<CodeSendResult> {
  const purpose = input.purpose === "sign-up" || input.purpose === "reset" ? input.purpose : "sign-in";
  return sendAccountCode(String(input.email ?? ""), purpose, await clientIp());
}

export type CompleteSignUpResult =
  | { ok: true; existing: boolean }
  | { ok: false; fields?: Partial<Record<SignUpField, SignUpProblem>>; error?: "CODE_INVALID" | "CODE_EXPIRED" | "CODE_USED_UP" | "BUSY" | "FAILED" };

const CODE_ERRORS: Record<string, "CODE_INVALID" | "CODE_EXPIRED" | "CODE_USED_UP"> = {
  INVALID_OTP: "CODE_INVALID",
  OTP_EXPIRED: "CODE_EXPIRED",
  TOO_MANY_ATTEMPTS: "CODE_USED_UP",
};

export async function completeSignUp(input: SignUpInput & { code: string }): Promise<CompleteSignUpResult> {
  const { values, errors } = validateSignUp(input);
  if (Object.keys(errors).length) return { ok: false, fields: errors };
  const otp = cleanCode(String(input.code ?? ""));
  if (!otp) return { ok: false, error: "CODE_INVALID" };
  const limit = await rateLimit(`sign-up:${await clientIp()}`, { windowSeconds: 60, max: 30 });
  if (!limit.ok) return { ok: false, error: "BUSY" };

  const existed = await prisma.customer.findUnique({ where: { email: values.email }, select: { id: true, hasAccount: true } });

  // Checks the code (5 tries, then void), creates the customer if there is none (a guest's record
  // is reused), marks the email verified and sets the session cookie.
  let signedIn: { token: string; user: { id: string } };
  try {
    signedIn = await getCustomerAuth().api.signInEmailOTP({
      body: { email: values.email, otp, name: values.name },
      headers: await headers(),
    });
  } catch (error) {
    const code = isAPIError(error) ? String((error.body as { code?: string } | undefined)?.code ?? "") : "";
    if (CODE_ERRORS[code]) return { ok: false, error: CODE_ERRORS[code] };
    if (isAPIError(error) && error.statusCode === 429) return { ok: false, error: "BUSY" };
    console.error("[account] sign-up could not be completed", error);
    return { ok: false, error: "FAILED" };
  }

  const userId = signedIn.user.id;
  const hash = await hashPassword(values.password);
  await prisma.$transaction(async (tx) => {
    const credential = await tx.customerAccount.findFirst({ where: { userId, providerId: "credential" }, select: { id: true } });
    if (credential) {
      // The email's owner just proved it with the code, so the new password replaces the old one,
      // and sessions elsewhere end, as after a password reset.
      await tx.customerAccount.update({ where: { id: credential.id }, data: { password: hash } });
      await tx.customerSession.deleteMany({ where: { userId, token: { not: signedIn.token } } });
    } else {
      await tx.customerAccount.create({ data: { userId, providerId: "credential", accountId: userId, password: hash } });
    }
    await tx.customer.update({ where: { id: userId }, data: { name: values.name, phone: values.phone, emailVerified: true, hasAccount: true } });
  });
  return { ok: true, existing: Boolean(existed?.hasAccount) };
}
