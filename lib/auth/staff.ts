import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prefixedAuthRateLimit } from "@/lib/security/rate-limit";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { audit } from "@/lib/admin/audit";
import { passwordProblem } from "./customer-rules";
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from "./password";

/**
 * Admin sign-in: email + password (Argon2id), then a TOTP code from an authenticator app.
 * Kept fully apart from customer accounts: own tables, own cookie prefix, own endpoint
 * (/api/admin-auth), and no public sign-up — staff are created by the Owner (DECISIONS.md 2).
 */
function createStaffAuth() {
  const { APP_URL, BETTER_AUTH_SECRET, NODE_ENV } = env();
  return betterAuth({
    appName: "MN Shoes & Watches admin",
    baseURL: APP_URL,
    basePath: "/api/admin-auth",
    secret: BETTER_AUTH_SECRET,
    trustedOrigins: [APP_URL],
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    user: {
      modelName: "staffUser",
      additionalFields: {
        role: { type: "string", input: false, required: false },
        isActive: { type: "boolean", input: false, required: false },
      },
    },
    session: {
      modelName: "staffSession",
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 30,
      freshAge: 60 * 15,
    },
    account: { modelName: "staffAccount" },
    verification: { modelName: "staffVerification" },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: 128,
      password: { hash: hashPassword, verify: verifyPassword },
      // Staff set their password only through an emailed one-time link (lib/admin/staff.ts):
      // the invite or a reset. Setting it signs them out everywhere else.
      revokeSessionsOnPasswordReset: true,
      async onPasswordReset({ user }) {
        // Opening the emailed link proves the address.
        await prisma.staffUser.update({ where: { id: user.id }, data: { emailVerified: true } });
        await audit(user.id, "staff.password", { type: "staff", id: user.id }, `${user.name} set a new password from an emailed link.`);
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/reset-password" && ctx.path !== "/change-password") return;
        const password: unknown = ctx.body?.newPassword;
        if (typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH && passwordProblem(password) === "TOO_COMMON") {
          throw new APIError("BAD_REQUEST", { code: "PASSWORD_TOO_COMMON", message: "That password is too common. Choose one that is harder to guess." });
        }
      }),
    },
    rateLimit: {
      enabled: true,
      customStorage: prefixedAuthRateLimit("staff"),
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 15 * 60, max: 10 },
        "/two-factor/verify-totp": { window: 15 * 60, max: 10 },
        "/two-factor/verify-backup-code": { window: 15 * 60, max: 5 },
        "/reset-password": { window: 15 * 60, max: 10 },
      },
    },
    advanced: {
      cookiePrefix: "mn-admin",
      useSecureCookies: NODE_ENV === "production",
    },
    databaseHooks: {
      session: {
        create: {
          // A deactivated staff member cannot start a session, even with the right password.
          async before(session) {
            const staff = await prisma.staffUser.findUnique({
              where: { id: session.userId },
              select: { isActive: true },
            });
            return staff?.isActive ? undefined : false;
          },
          async after(session) {
            await prisma.staffUser.update({ where: { id: session.userId }, data: { lastLoginAt: new Date() } });
          },
        },
      },
    },
    plugins: [
      twoFactor({
        issuer: "MN Shoes & Watches",
        twoFactorTable: "staffTwoFactor",
        backupCodeOptions: { amount: 10, length: 10 },
      }),
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createStaffAuth> | undefined;

export function getStaffAuth() {
  instance ??= createStaffAuth();
  return instance;
}
