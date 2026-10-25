/*
 * npm run db:seed — store structure only (see base.ts). `npm run seed` runs this and then adds
 * the demo catalogue, orders and content (scripts/seed-demo.ts).
 */
import { existsSync } from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../lib/generated/prisma/client";
import { databaseUrl } from "../../lib/db/paths";
import { seedBase } from "./base";

if (existsSync(".env")) process.loadEnvFile(".env");

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });

seedBase(prisma)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
