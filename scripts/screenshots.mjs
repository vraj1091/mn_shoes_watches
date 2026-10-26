// npm run screenshots — full-page screenshots of the main pages, light and dark, phone (390 px)
// and desktop (1440 px), saved to screenshots/. Needs the shop running (npm run dev) with the
// demo data (npm run seed). BASE_URL picks another address; the admin login comes from .env.
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

if (existsSync(".env")) process.loadEnvFile(".env");

const base = process.env.BASE_URL ?? "http://localhost:3001";
const out = "screenshots";
const admin = {
  email: process.env.ADMIN_EMAIL ?? process.env.SEED_OWNER_EMAIL ?? "admin@example.com",
  password: process.env.ADMIN_PASSWORD ?? process.env.SEED_OWNER_PASSWORD ?? "MnShoes-Admin-2026",
};
const widths = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const pages = [
  ["home", "/"],
  ["category", "/watches"],
  ["product", "/product/kensington-plain-toe-oxford"],
  ["cart", "/cart"],
  ["checkout", "/checkout"],
  ["admin-dashboard", "/admin"],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const problems = [];

/** Scrolls to the bottom and back so lazy images load before a full-page capture. */
async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => Promise.all([...document.images].filter((img) => !img.complete).map((img) => new Promise((resolve) => img.addEventListener("load", resolve, { once: true }) || setTimeout(resolve, 3000)))));
  await page.waitForTimeout(300);
}

// One staff session, shared by every screenshot context.
const login = await browser.newContext();
const loginPage = await login.newPage();
await loginPage.goto(`${base}/admin/sign-in`);
await loginPage.getByLabel("Email").fill(admin.email);
await loginPage.getByLabel("Password").fill(admin.password);
await loginPage.getByRole("button", { name: "Sign in" }).click();
await loginPage.waitForURL((url) => !url.pathname.includes("sign-in"), { timeout: 30_000 });
// Production prefixes secure cookies with __Secure-, so match the name anywhere.
const staffCookies = (await login.cookies()).filter((cookie) => cookie.name.includes("mn-admin"));
await login.close();

for (const [device, viewport] of Object.entries(widths)) {
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1, isMobile: device === "phone", hasTouch: device === "phone" });
    await context.addCookies(staffCookies);
    const page = await context.newPage();
    page.on("pageerror", (error) => problems.push(`${device}/${scheme} ${page.url()}: ${error.message}`));
    page.on("console", (message) => message.type() === "error" && problems.push(`${device}/${scheme} ${page.url()}: ${message.text().slice(0, 200)}`));

    // A pair of shoes in the bag, so the bag and checkout have something to show.
    await page.goto(`${base}/product/kensington-plain-toe-oxford`);
    await page.getByRole("radio", { name: "Black", exact: true }).check({ force: true });
    await page.getByRole("radio", { name: "UK 9", exact: true }).check({ force: true });
    await page.getByRole("button", { name: "Add to bag" }).first().click();
    await page.getByRole("dialog", { name: /Your bag/ }).waitFor();

    for (const [name, path] of pages) {
      await page.goto(base + path);
      await settle(page);
      const file = `${out}/${name}-${device}-${scheme}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log("saved", file);
    }
    await context.close();
  }
}

await browser.close();
if (problems.length) {
  console.log(`\nConsole errors:\n${problems.join("\n")}`);
  process.exitCode = 1;
}
