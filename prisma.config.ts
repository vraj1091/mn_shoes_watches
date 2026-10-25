import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./lib/db/paths";

// Prisma 7 no longer reads .env by itself.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    url: databaseUrl(),
  },
});
