/*
 * npm run admin:recover -- <email> [--password "<new password>"]
 *
 * The way back in when a staff member (usually the owner) is locked out: lost phone, used-up
 * backup codes, forgotten password, switched-off account or too many attempts. Needs access to
 * the server and its database, which is the proof of ownership (DECISIONS.md 70). It:
 *  - removes two-step sign-in (authenticator and backup codes),
 *  - switches the account back on and signs it out everywhere,
 *  - clears the staff sign-in attempt counters,
 *  - with --password, sets that password (at least 12 characters),
 * and records what it did in the admin's Activity log. In production, an owner or manager is
 * asked to set up two-step sign-in again after signing in.
 */
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";
import { databaseUrl } from "../lib/db/paths";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../lib/auth/password";

if (existsSync(".env")) process.loadEnvFile(".env");

const args = process.argv.slice(2);
const passwordIndex = args.indexOf("--password");
const password = passwordIndex >= 0 ? args[passwordIndex + 1] : undefined;
const email = args.find((arg, index) => !arg.startsWith("--") && !(passwordIndex >= 0 && index === passwordIndex + 1))?.trim().toLowerCase();

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });

async function main() {
  if (!email || (passwordIndex >= 0 && !password)) {
    console.error('Usage: npm run admin:recover -- <email> [--password "<new password>"]');
    process.exitCode = 1;
    return;
  }
  if (password !== undefined && password.length < MIN_PASSWORD_LENGTH) {
    console.error(`The new password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exitCode = 1;
    return;
  }
  const staff = await prisma.staffUser.findUnique({ where: { email }, select: { id: true, name: true, role: true } });
  if (!staff) {
    const all = await prisma.staffUser.findMany({ select: { email: true, role: true }, orderBy: { createdAt: "asc" } });
    console.error(`No staff account uses ${email}. Staff accounts: ${all.map((entry) => `${entry.email} (${entry.role})`).join(", ") || "none"}.`);
    process.exitCode = 1;
    return;
  }

  const hash = password === undefined ? null : await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    await tx.staffTwoFactor.deleteMany({ where: { userId: staff.id } });
    await tx.staffSession.deleteMany({ where: { userId: staff.id } });
    await tx.staffUser.update({ where: { id: staff.id }, data: { twoFactorEnabled: false, isActive: true } });
    await tx.rateLimit.deleteMany({ where: { key: { startsWith: "staff:" } } });
    if (hash) {
      const credential = await tx.staffAccount.findFirst({ where: { userId: staff.id, providerId: "credential" }, select: { id: true } });
      if (credential) await tx.staffAccount.update({ where: { id: credential.id }, data: { password: hash } });
      else await tx.staffAccount.create({ data: { id: randomUUID(), userId: staff.id, accountId: staff.id, providerId: "credential", password: hash } });
    }
    await tx.auditLog.create({
      data: {
        storeId: "main",
        staffId: staff.id,
        action: "staff.recover",
        entityType: "staff",
        entityId: staff.id,
        summary: `Recovered ${staff.name}’s account from the server command line: two-step sign-in removed, signed out everywhere${hash ? ", new password set" : ""}.`,
      },
    });
  });

  console.info(`Recovered ${email} (${staff.role}).`);
  console.info("- Two-step sign-in removed; all sessions ended; account switched on; sign-in attempt limits cleared.");
  console.info(hash ? "- New password set." : "- Password unchanged. Add --password \"<new password>\" to set one.");
  if (staff.role === "OWNER" || staff.role === "MANAGER") {
    console.info("- In production you will be asked to set up two-step sign-in again after signing in. Keep the new backup codes safe.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
