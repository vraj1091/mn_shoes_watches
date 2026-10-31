import "server-only";
import { render } from "@react-email/render";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/messaging/email";
import { INDIAN_MOBILE, sendOtpSms } from "@/lib/messaging/sms";
import { prefixedAuthRateLimit, rateLimit } from "@/lib/security/rate-limit";
import { AccountCodeEmail, accountCodeSubject, accountCodeText, type CodePurpose } from "@/emails/account-code";
import { hashPassword, verifyPassword } from "./password";
import { CODE_RESEND_SECONDS, codeCooldownKey, CUSTOMER_PASSWORD_MAX, CUSTOMER_PASSWORD_MIN, passwordProblem } from "./customer-rules";

export const CODE_MINUTES = 10;

export async function storeName(): Promise<string> {
  const settings = await prisma.storeSettings.findFirst({ select: { storeName: true } });
  return settings?.storeName ?? "MN Shoes & Watches";
}

/** Writes and sends one account code email. Throws when the email cannot be sent. */
export async function emailAccountCode(email: string, code: string, purpose: CodePurpose): Promise<void> {
  const name = await storeName();
  const props = { storeName: name, code, minutesValid: CODE_MINUTES, purpose };
  const html = await render(AccountCodeEmail(props));
  await sendEmail({ to: email, subject: accountCodeSubject(props), html, text: accountCodeText(props) });
}

const PURPOSE_BY_TYPE = { "sign-in": "sign-in", "email-verification": "verify", "forget-password": "reset", "change-email": "verify" } as const;

/** Per-email limits, on top of Better Auth's per-IP ones (DECISIONS.md 26 and 65). */
async function limitPerEmail(key: string, email: string, windowSeconds: number, max: number) {
  const result = await rateLimit(`${key}:${email.toLowerCase()}`, { windowSeconds, max });
  if (!result.ok) {
    throw new APIError("TOO_MANY_REQUESTS", { code: "TOO_MANY_ATTEMPTS", message: `Too many attempts. Try again in ${result.retryAfterSeconds} seconds.` });
  }
}

/**
 * Customer accounts: email and password, confirmed by a 6-digit code sent by email before the
 * account is saved (DECISIONS.md 64). Signing in with only an emailed code, Google, or an SMS
 * code (MSG91) still works. Accounts stay optional; checkout works as a guest (DECISIONS.md 4).
 */
function createCustomerAuth() {
  const { APP_URL, BETTER_AUTH_SECRET, NODE_ENV, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env();
  const google =
    GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? { google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, prompt: "select_account" as const } }
      : {};

  return betterAuth({
    appName: "MN Shoes & Watches",
    baseURL: APP_URL,
    basePath: "/api/auth",
    secret: BETTER_AUTH_SECRET,
    trustedOrigins: [APP_URL],
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    user: {
      modelName: "customer",
      additionalFields: {
        hasAccount: { type: "boolean", input: false, required: false },
        phone: { type: "string", input: false, required: false },
      },
    },
    session: {
      modelName: "customerSession",
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    account: {
      modelName: "customerAccount",
      accountLinking: { enabled: true, trustedProviders: ["google", "email-otp"] },
    },
    verification: { modelName: "customerVerification" },
    socialProviders: google,
    emailAndPassword: {
      enabled: true,
      // New accounts are created by completeSignUp only after the emailed code is checked, so a
      // password is never stored for an unproven email (DECISIONS.md 64).
      disableSignUp: true,
      requireEmailVerification: true,
      minPasswordLength: CUSTOMER_PASSWORD_MIN,
      maxPasswordLength: CUSTOMER_PASSWORD_MAX,
      password: { hash: hashPassword, verify: verifyPassword },
      revokeSessionsOnPasswordReset: true,
    },
    // Per-IP limits are generous on purpose: Indian mobile networks put many shoppers behind one
    // shared IP (carrier-grade NAT), so strict IP limits would lock out strangers. Brute force is
    // stopped per code (5 tries, then void) and per email (see hooks below) instead.
    rateLimit: {
      enabled: true,
      customStorage: prefixedAuthRateLimit("customer"),
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 30 },
        "/sign-in/email-otp": { window: 60, max: 30 },
        "/email-otp/send-verification-otp": { window: 60, max: 15 },
        "/email-otp/request-password-reset": { window: 60, max: 10 },
        "/email-otp/reset-password": { window: 60, max: 30 },
        "/email-otp/verify-email": { window: 60, max: 30 },
        "/phone-number/send-otp": { window: 60, max: 15 },
        "/phone-number/verify": { window: 60, max: 30 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const body = (ctx.body ?? {}) as { email?: unknown; password?: unknown };
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (ctx.path === "/sign-in/email" && email) await limitPerEmail("login", email, 15 * 60, 10);
        if ((ctx.path === "/email-otp/send-verification-otp" || ctx.path === "/email-otp/request-password-reset") && email) {
          const type = ctx.path === "/email-otp/request-password-reset" ? "forget-password" : String((ctx.body as { type?: unknown }).type ?? "");
          const wait = await rateLimit(codeCooldownKey(type, email), { windowSeconds: CODE_RESEND_SECONDS, max: 1 });
          if (!wait.ok) throw new APIError("TOO_MANY_REQUESTS", { code: "TOO_MANY_ATTEMPTS", message: `Wait ${wait.retryAfterSeconds} seconds before asking for another code.` });
        }
        if (ctx.path === "/email-otp/reset-password" && typeof body.password === "string") {
          const problem = passwordProblem(body.password, { email });
          if (problem) throw new APIError("BAD_REQUEST", { code: `PASSWORD_${problem}`, message: "Choose a stronger password." });
        }
      }),
    },
    advanced: {
      cookiePrefix: "mn",
      useSecureCookies: NODE_ENV === "production",
    },
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            return { data: { ...user, email: user.email.toLowerCase(), hasAccount: true } };
          },
        },
      },
      session: {
        create: {
          // A guest-checkout record becomes an account the first time its owner signs in.
          async after(session) {
            await prisma.customer.updateMany({
              where: { id: session.userId, hasAccount: false },
              data: { hasAccount: true },
            });
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: CODE_MINUTES * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        rateLimit: { window: 60, max: 15 },
        // The shop's own forms send codes through lib/auth/account-codes.ts, which waits for the
        // email and reports a failure. These endpoints stay for API clients; Better Auth runs this
        // in the background, so a failure here can only be logged.
        async sendVerificationOTP({ email, otp, type }) {
          try {
            await emailAccountCode(email, otp, PURPOSE_BY_TYPE[type]);
          } catch (error) {
            console.error(`[auth] could not email a ${type} code to ${email}`, error);
            throw error;
          }
        },
      }),
      phoneNumber({
        otpLength: 6,
        expiresIn: 5 * 60,
        allowedAttempts: 5,
        phoneNumberValidator: (value) => INDIAN_MOBILE.test(value),
        async sendOTP({ phoneNumber: number, code }) {
          await sendOtpSms(number, code);
        },
        signUpOnVerification: {
          // A phone-only shopper gets an address that can never receive mail until they add a real one.
          getTempEmail: (number) => `${number.replace(/\D/g, "")}@phone.invalid`,
          getTempName: () => "",
        },
      }),
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createCustomerAuth> | undefined;

export function getCustomerAuth() {
  instance ??= createCustomerAuth();
  return instance;
}
