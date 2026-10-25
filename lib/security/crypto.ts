import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * AES-256-GCM for secrets kept in the database (payment, shipping and messaging API keys).
 * Output format: base64(iv[12] | authTag[16] | ciphertext). The key is APP_ENCRYPTION_KEY,
 * 32 random bytes in base64, and never leaves the server.
 */

const IV_BYTES = 12;
const TAG_BYTES = 16;

function keyFrom(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes, base64-encoded");
  return key;
}

export function encryptSecret(plaintext: string, base64Key: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(base64Key), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptSecret(payload: string, base64Key: string): string {
  const raw = Buffer.from(payload, "base64");
  if (raw.length < IV_BYTES + TAG_BYTES) throw new Error("Encrypted value is too short");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(base64Key), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Shows enough of a secret to recognise it in the admin without revealing it: "rzp_••••••3kQ". */
export function maskSecret(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••••${value.slice(-3)}`;
}
