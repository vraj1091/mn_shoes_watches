// Starts the production build against a fresh, separate database for end-to-end tests:
// data/e2e is wiped, migrated and seeded, then the standalone server runs on port 3100.
// Used by playwright.config.ts; run `npm run build` first.
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const config = JSON.parse(readFileSync("tests/e2e/e2e-config.json", "utf8"));
if (existsSync(".env")) process.loadEnvFile(".env"); // secrets; CI provides them as variables

const dataDir = path.resolve(config.dataDir);
rmSync(dataDir, { recursive: true, force: true });

const env = {
  ...process.env,
  NODE_ENV: "production",
  DATA_DIR: dataDir,
  APP_URL: `http://localhost:${config.port}`,
  PORT: String(config.port),
  HOSTNAME: "localhost",
  EMAIL_TRANSPORT: "outbox",
  SEED_OWNER_EMAIL: config.owner.email,
  SEED_OWNER_NAME: config.owner.name,
  SEED_OWNER_PASSWORD: config.owner.password,
};

execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
execSync("npx tsx prisma/seed/index.ts", { env, stdio: "inherit" });
execSync("node scripts/prepare-standalone.mjs", { env, stdio: "inherit" });

const server = spawn(process.execPath, [".next/standalone/server.js"], { env, stdio: "inherit" });
const stop = () => server.kill("SIGTERM");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
