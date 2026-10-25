import { defineConfig, devices } from "@playwright/test";
import config from "./tests/e2e/e2e-config.json" with { type: "json" };

const baseURL = `http://localhost:${config.port}`;

/**
 * End-to-end tests run against the production build with its own database in data/e2e
 * (see scripts/e2e-server.mjs). Run `npm run build` before `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `${baseURL}/api/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
