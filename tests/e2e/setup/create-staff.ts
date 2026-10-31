/*
 * Test-only: adds a Manager and a Staff account to the end-to-end database, next to the seeded
 * owner, so each role's access can be tested. The Manager has to set up two-factor at first
 * sign-in, as in production; tests/e2e/helpers.ts does that once and remembers the secret.
 * Run by scripts/e2e-server.mjs.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../../lib/generated/prisma/client";
import { databaseUrl } from "../../../lib/db/paths";
import { hashPassword } from "../../../lib/auth/password";

type Account = { email: string; name: string; password: string };
const config = JSON.parse(readFileSync("tests/e2e/e2e-config.json", "utf8")) as { manager: Account; staff: Account };
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });

async function create({ email, name, password }: Account, role: "MANAGER" | "STAFF") {
  if (await prisma.staffUser.findUnique({ where: { email } })) return;
  const id = randomUUID();
  await prisma.staffUser.create({
    data: {
      id,
      storeId: "main",
      name,
      email,
      emailVerified: true,
      role,
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
    },
  });
  console.info(`Created ${role.toLowerCase()} ${email} for the end-to-end tests.`);
}

async function main() {
  await create(config.manager, "MANAGER");
  await create(config.staff, "STAFF");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
