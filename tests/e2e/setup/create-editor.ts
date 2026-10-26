/*
 * Test-only: adds a Catalogue editor account to the end-to-end database. That role may view orders
 * and manage products but never needs two-factor, so the shop-flow tests can use the admin without
 * depending on the owner's two-factor set-up in auth.spec.ts. Run by scripts/e2e-server.mjs.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../../lib/generated/prisma/client";
import { databaseUrl } from "../../../lib/db/paths";
import { hashPassword } from "../../../lib/auth/password";

const config = JSON.parse(readFileSync("tests/e2e/e2e-config.json", "utf8")) as { editor: { email: string; name: string; password: string } };
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });

async function main() {
  const { email, name, password } = config.editor;
  if (await prisma.staffUser.findUnique({ where: { email } })) return;
  const id = randomUUID();
  await prisma.staffUser.create({
    data: {
      id,
      storeId: "main",
      name,
      email,
      emailVerified: true,
      role: "CATALOGUE_EDITOR",
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
    },
  });
  console.info(`Created catalogue editor ${email} for the end-to-end tests.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
