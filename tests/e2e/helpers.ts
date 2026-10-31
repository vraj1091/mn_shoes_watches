import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import config from "./e2e-config.json" with { type: "json" };

export type StaffAccount = { email: string; name: string; password: string };

export const OWNER: StaffAccount = config.owner;
/** A Manager: catalogue, orders, coupons, banners, customers; must use two-factor (production rules). */
export const MANAGER: StaffAccount = config.manager;
/** A Staff member: orders and a read-only catalogue; no two-factor needed. */
export const STAFF: StaffAccount = config.staff;
/** The e2e server's address, for pages opened outside the test fixtures (e.g. in beforeAll). */
export const BASE_URL = `http://localhost:${config.port}`;

const dataFile = (name: string) => {
  mkdirSync(path.resolve(config.dataDir), { recursive: true });
  return path.resolve(config.dataDir, name);
};
const secretFile = (email: string) => dataFile(`totp-${email}.txt`);
const sessionFile = (email: string) => dataFile(`session-${email}.json`);

/** Remembers a staff member's authenticator secret for later sign-ins in this run (data/e2e is wiped per run). */
export function saveTotpSecret(email: string, secret: string) {
  writeFileSync(secretFile(email), secret);
}

/**
 * Signs a staff member in and waits for the dashboard. Staff sign-in is rate-limited (10 per
 * 15 minutes), so the session is kept in data/e2e and reused by later tests while it is valid.
 * A Manager or Owner without two-factor sets it up on the way (as production requires), and the
 * secret is remembered for the next sign-in.
 */
export async function signInStaff(page: Page, staff: StaffAccount = MANAGER) {
  // Admin pages stream a loading skeleton first, so a redirect (to two-factor set-up, say) can land
  // after the address already reads /admin. Wait for what the page shows, not for the address.
  const dashboard = page.getByRole("heading", { level: 1, name: /^Hello, / });
  const signInForm = page.getByRole("button", { name: "Sign in", exact: true });
  const codeStep = page.getByRole("button", { name: "Continue" });
  const setUpStep = page.getByRole("button", { name: "Start set-up" });

  let reused = false;
  if (existsSync(sessionFile(staff.email))) {
    const { cookies } = JSON.parse(readFileSync(sessionFile(staff.email), "utf8")) as { cookies: Parameters<ReturnType<Page["context"]>["addCookies"]>[0] };
    await page.context().addCookies(cookies);
    await page.goto("/admin");
    await expect(dashboard.or(signInForm).or(setUpStep)).toBeVisible();
    if (await dashboard.isVisible()) return;
    reused = await setUpStep.isVisible();
  }
  if (!reused) {
    await page.goto("/admin/sign-in");
    await page.getByLabel("Email").fill(staff.email);
    await page.getByLabel("Password").fill(staff.password);
    await signInForm.click();
    await expect(dashboard.or(codeStep).or(setUpStep)).toBeVisible();
  }

  if (await codeStep.isVisible()) {
    await page.getByLabel("6-digit code").fill(totp(readFileSync(secretFile(staff.email), "utf8").trim()));
    await codeStep.click();
  } else if (await setUpStep.isVisible()) {
    await page.getByLabel("Your password").fill(staff.password);
    await setUpStep.click();
    const secret = (await page.locator(".select-all").innerText()).trim();
    saveTotpSecret(staff.email, secret);
    await page.getByLabel("6-digit code").fill(totp(secret));
    await page.getByRole("button", { name: "Turn on two-factor" }).click();
    await page.getByRole("button", { name: "I have saved them" }).click();
  }
  await expect(dashboard).toBeVisible();
  const { cookies } = await page.context().storageState();
  writeFileSync(sessionFile(staff.email), JSON.stringify({ cookies: cookies.filter((cookie) => cookie.name.includes("mn-admin")) }));
}

/**
 * Picks a size, colour or theme the way a shopper does, by clicking its visible label (the radio
 * itself is visually hidden). Playwright waits for the label to stop moving, e.g. after the page
 * scrolls to the size picker.
 */
export async function chooseRadio(page: Page, name: string, scope: Page | Locator = page) {
  await scope.locator("label").filter({ has: page.getByRole("radio", { name, exact: true }) }).click();
  await expect(page.getByRole("radio", { name, exact: true }).first()).toBeChecked();
}

/** Latest 6-digit code emailed to `to`, read from the outbox the e2e server writes to. */
export async function latestEmailCode(to: string, after: number, timeoutMs = 10_000): Promise<string> {
  const html = await latestEmail(to, after, timeoutMs);
  const code = /Subject: (\d{6}) is your/.exec(html)?.[1];
  if (!code) throw new Error(`The newest email to ${to} has no code`);
  return code;
}

/** The newest email to `to` sent at or after `after`, as raw HTML. */
export async function latestEmail(to: string, after: number, timeoutMs = 10_000): Promise<string> {
  const outbox = path.resolve(config.dataDir, "outbox");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let files: string[] = [];
    try {
      files = readdirSync(outbox);
    } catch {
      // The outbox folder appears with the first email.
    }
    const match = files
      .filter((file) => file.endsWith(`-${to.replace(/[^a-z0-9@._-]/gi, "_")}.html`))
      .map((file) => ({ file, time: Number(file.split("-")[0]) }))
      .filter(({ time }) => time >= after)
      .sort((a, b) => b.time - a.time)[0];
    if (match) return readFileSync(path.join(outbox, match.file), "utf8");
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No email for ${to} within ${timeoutMs} ms`);
}

/** The set-password link in the newest staff invite or reset email to `to`, as a path. */
export async function latestStaffLink(to: string, after: number): Promise<string> {
  const html = await latestEmail(to, after);
  const href = /href="([^"]*\/admin\/set-password\?token=[^"]+)"/.exec(html)?.[1];
  if (!href) throw new Error(`No set-password link in the email to ${to}`);
  const url = new URL(href.replace(/&amp;/g, "&"));
  return `${url.pathname}${url.search}`;
}

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s), the same codes an authenticator app shows. */
export function totp(base32Secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32Secret.replace(/=+$/, "").toUpperCase()) {
    const value = alphabet.indexOf(char);
    if (value === -1) throw new Error(`Invalid base32 character ${char}`);
    bits += value.toString(2).padStart(5, "0");
  }
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}
