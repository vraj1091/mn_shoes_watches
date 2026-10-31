import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("keeps settings, payments, staff, demo removal and the activity log with the owner", () => {
    for (const role of STAFF_ROLES.filter((role) => role !== "OWNER")) {
      for (const permission of ["settings.manage", "settings.payments", "staff.manage", "demo.remove", "activity.view"] as const) {
        expect(can(role, permission), `${role} ${permission}`).toBe(false);
      }
    }
  });

  it("lets a manager run the catalogue, orders, coupons, banners and customers", () => {
    for (const permission of ["catalogue.manage", "orders.manage", "orders.refund", "discounts.manage", "content.manage", "customers.manage", "media.manage"] as const) {
      expect(can("MANAGER", permission), permission).toBe(true);
    }
  });

  it("lets staff view and update orders and see products and stock, and nothing more", () => {
    const allowed = PERMISSIONS.filter((permission) => can("STAFF", permission));
    expect(allowed.sort()).toEqual(["catalogue.view", "dashboard.view", "inventory.view", "orders.manage", "orders.view"]);
    // No deletions: deleting anything needs catalogue, coupon, banner or settings rights.
    for (const permission of ["catalogue.manage", "discounts.manage", "content.manage", "orders.refund", "customers.view"] as const) {
      expect(can("STAFF", permission), permission).toBe(false);
    }
  });

  describe("two-factor", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("is required for owner and manager only, in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ADMIN_REQUIRE_2FA", "");
      expect(STAFF_ROLES.filter(requiresTwoFactor)).toEqual(["OWNER", "MANAGER"]);
    });

    it("is optional in development, so the demo admin works after npm run seed", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("ADMIN_REQUIRE_2FA", "");
      expect(STAFF_ROLES.filter(requiresTwoFactor)).toEqual([]);
    });

    it("follows ADMIN_REQUIRE_2FA when it is set", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("ADMIN_REQUIRE_2FA", "true");
      expect(STAFF_ROLES.filter(requiresTwoFactor)).toEqual(["OWNER", "MANAGER"]);
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ADMIN_REQUIRE_2FA", "false");
      expect(STAFF_ROLES.filter(requiresTwoFactor)).toEqual([]);
    });
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
