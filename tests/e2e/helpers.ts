import { createHmac } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import config from "./e2e-config.json" with { type: "json" };

export const OWNER = config.owner;

/** Latest 6-digit code emailed to `to`, read from the outbox the e2e server writes to. */
export async function latestEmailCode(to: string, after: number, timeoutMs = 10_000): Promise<string> {
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
    if (match) {
      const html = readFileSync(path.join(outbox, match.file), "utf8");
      const code = /Subject: (\d{6}) is your/.exec(html)?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No sign-in email for ${to} within ${timeoutMs} ms`);
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
