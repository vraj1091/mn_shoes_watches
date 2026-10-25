import "server-only";
import { render } from "@react-email/render";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/messaging/email";
import { INDIAN_MOBILE, sendOtpSms } from "@/lib/messaging/sms";
import { SignInCodeEmail, signInCodeText } from "@/emails/sign-in-code";

const OTP_MINUTES = 10;

async function storeName(): Promise<string> {
  const settings = await prisma.storeSettings.findFirst({ select: { storeName: true } });
  return settings?.storeName ?? "MN Shoes & Watches";
}

/**
 * Customer sign-in: a 6-digit code by email (default), Google, or a code by SMS through MSG91.
 * No passwords to forget. Accounts are optional; checkout works as a guest (DECISIONS.md 4).
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
    // Per-IP limits are generous on purpose: Indian mobile networks put many shoppers behind one
    // shared IP (carrier-grade NAT), so strict IP limits would lock out strangers. Brute force is
    // stopped per code instead: 5 tries, then the code is void and a new one must be sent.
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email-otp": { window: 60, max: 30 },
        "/email-otp/send-verification-otp": { window: 60, max: 15 },
        "/phone-number/send-otp": { window: 60, max: 15 },
        "/phone-number/verify": { window: 60, max: 30 },
      },
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
        expiresIn: OTP_MINUTES * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        rateLimit: { window: 60, max: 15 },
        async sendVerificationOTP({ email, otp, type }) {
          const name = await storeName();
          const props = {
            storeName: name,
            code: otp,
            minutesValid: OTP_MINUTES,
            purpose: type === "sign-in" ? ("customer" as const) : ("verify" as const),
          };
          // Not awaited (Better Auth's advice), so response time does not reveal whether the email exists.
          void (async () => {
            const html = await render(SignInCodeEmail(props));
            await sendEmail({ to: email, subject: `${otp} is your ${name} code`, html, text: signInCodeText(props) });
          })().catch((error: unknown) => console.error("[auth] sign-in code email failed", error));
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
