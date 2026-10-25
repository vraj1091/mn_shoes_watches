// Copies the files `next build` leaves outside .next/standalone into it, so the standalone
// folder runs on its own with `node server.js` (Next.js does not copy these by design).
import { cpSync, existsSync } from "node:fs";

const standalone = ".next/standalone";
if (!existsSync(standalone)) {
  console.error("No .next/standalone folder. Run `npm run build` first.");
  process.exit(1);
}

cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${standalone}/public`, { recursive: true });
console.info("Standalone build ready: .next/standalone (start with `node server.js`).");
