import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret, safeEqual, sha256Hex } from "@/lib/security/crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { can, PERMISSIONS, requiresTwoFactor, STAFF_ROLES } from "@/lib/auth/permissions";
import { safeNextPath } from "@/lib/safe-redirect";

const key = randomBytes(32).toString("base64");

describe("secret encryption", () => {
  it("round-trips a secret", () => {
    const secret = JSON.stringify({ keySecret: "rzp_test_abc123", webhookSecret: "whsec" });
    expect(decryptSecret(encryptSecret(secret, key), key)).toBe(secret);
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same", key)).not.toBe(encryptSecret("same", key));
  });

  it("refuses a tampered value", () => {
    const sealed = Buffer.from(encryptSecret("secret", key), "base64");
    sealed[sealed.length - 1]! ^= 0xff;
    expect(() => decryptSecret(sealed.toString("base64"), key)).toThrow();
  });

  it("refuses the wrong key", () => {
    const other = randomBytes(32).toString("base64");
    expect(() => decryptSecret(encryptSecret("secret", key), other)).toThrow();
  });

  it("rejects keys that are not 32 bytes", () => {
    expect(() => encryptSecret("x", randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
  });

  it("masks secrets for display", () => {
    expect(maskSecret("rzp_live_ABCDEFGH3kQ")).toBe("rzp_••••••3kQ");
    expect(maskSecret("short")).toBe("••••");
  });

  it("hashes and compares in constant time", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("staff passwords", () => {
  it("hashes with Argon2id and verifies", async () => {
    const digest = await hashPassword("correct horse battery");
    expect(digest.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword({ hash: digest, password: "correct horse battery" })).toBe(true);
    expect(await verifyPassword({ hash: digest, password: "wrong horse battery" })).toBe(false);
  });

  it("treats a malformed hash as a failed login, not a crash", async () => {
    expect(await verifyPassword({ hash: "not-a-hash", password: "anything" })).toBe(false);
  });
});

describe("staff permissions", () => {
  it("gives the owner everything", () => {
    expect(PERMISSIONS.every((permission) => can("OWNER", permission))).toBe(true);
  });

  it("keeps API keys and staff management with the owner only", () => {
    for (const role of STAFF_ROLES.filter((role) => role !== "OWNER")) {
      expect(can(role, "settings.secrets")).toBe(false);
      expect(can(role, "staff.manage")).toBe(false);
    }
  });

  it("does not let order staff refund or edit the catalogue", () => {
    expect(can("ORDER_STAFF", "orders.manage")).toBe(true);
    expect(can("ORDER_STAFF", "orders.refund")).toBe(false);
    expect(can("ORDER_STAFF", "catalogue.manage")).toBe(false);
  });

  it("does not let catalogue editors see customers or money", () => {
    expect(can("CATALOGUE_EDITOR", "catalogue.manage")).toBe(true);
    expect(can("CATALOGUE_EDITOR", "customers.view")).toBe(false);
    expect(can("CATALOGUE_EDITOR", "orders.refund")).toBe(false);
  });

  it("requires two-factor for owner and manager only", () => {
    expect(STAFF_ROLES.filter(requiresTwoFactor)).toEqual(["OWNER", "MANAGER"]);
  });
});

describe("redirect after sign-in", () => {
  it.each([
    ["/account/orders", "/account/orders"],
    ["https://evil.example", "/account"],
    ["//evil.example", "/account"],
    ["/\\evil.example", "/account"],
    [undefined, "/account"],
    [["/a", "/b"], "/account"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input, "/account")).toBe(expected);
  });
});
