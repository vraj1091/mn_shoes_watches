import { describe, expect, it } from "vitest";
import { cleanCode, passwordProblem, passwordStrength, validateSignUp } from "@/lib/auth/customer-rules";
import { accountCodeSubject } from "@/emails/account-code";

describe("customer passwords", () => {
  it("needs at least 8 and at most 128 characters", () => {
    expect(passwordProblem("short1")).toBe("TOO_SHORT");
    expect(passwordProblem("x".repeat(129))).toBe("TOO_LONG");
    expect(passwordProblem("brown derby shoes")).toBeNull();
  });

  it("refuses passwords people guess first, including the usual Indian ones", () => {
    for (const weak of ["password", "Password123", "12345678", "1234567890", "qwerty123", "india@123", "jaishriram", "aaaaaaaaaa"]) {
      expect(passwordProblem(weak), weak).toBe("TOO_COMMON");
    }
  });

  it("refuses a password that contains the email's name part", () => {
    expect(passwordProblem("priya.shah2026", { email: "priya.shah@example.com" })).toBe("CONTAINS_EMAIL");
    // Very short name parts are too common to block.
    expect(passwordProblem("kalol leather 9", { email: "kal@example.com" })).toBeNull();
  });

  it("rates strength from length and variety, and a blocked password is always weak", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("password")).toBe(1);
    expect(passwordStrength("tan derby")).toBe(2);
    // Variety helps, but an 11-character password is still only fair: length counts most.
    expect(passwordStrength("Tan-derby-9")).toBe(2);
    expect(passwordStrength("Tan-derby-9-kalol")).toBe(4);
    expect(passwordStrength("tan derby shoes kalol")).toBe(3);
    expect(passwordStrength("Tan derby, UK 9 please")).toBe(4);
  });
});

describe("sign-up form", () => {
  const good = { name: "  Priya   Shah ", email: " Priya@Example.com ", phone: "98765 43210", password: "brown derby shoes" };

  it("cleans the values: one space in names, lower-case email, +91 phone", () => {
    const { values, errors } = validateSignUp(good);
    expect(errors).toEqual({});
    expect(values).toEqual({ name: "Priya Shah", email: "priya@example.com", phone: "+919876543210", password: "brown derby shoes" });
  });

  it("names the problem for every field", () => {
    expect(validateSignUp({ name: "", email: "", phone: "", password: "" }).errors).toEqual({
      name: "REQUIRED",
      email: "REQUIRED",
      phone: "REQUIRED",
      password: "REQUIRED",
    });
    expect(validateSignUp({ name: "1", email: "priya@", phone: "12345", password: "short" }).errors).toEqual({
      name: "INVALID",
      email: "INVALID",
      phone: "INVALID",
      password: "TOO_SHORT",
    });
  });

  it("accepts Indian mobiles written the usual ways and refuses landlines", () => {
    for (const phone of ["9876543210", "+91 98765 43210", "919876543210", "09876543210", "98765-43210"]) {
      expect(validateSignUp({ ...good, phone }).values.phone, phone).toBe("+919876543210");
    }
    expect(validateSignUp({ ...good, phone: "02764 222333" }).errors.phone).toBe("INVALID");
    expect(validateSignUp({ ...good, phone: "5876543210" }).errors.phone).toBe("INVALID");
  });

  it("accepts names in any script", () => {
    expect(validateSignUp({ ...good, name: "પ્રિયા શાહ" }).errors.name).toBeUndefined();
    expect(validateSignUp({ ...good, name: "प्रिया" }).errors.name).toBeUndefined();
  });
});

describe("emailed codes", () => {
  it("takes 6 digits, with spaces or dashes as people type them", () => {
    expect(cleanCode("123456")).toBe("123456");
    expect(cleanCode("123 456")).toBe("123456");
    expect(cleanCode("123-456")).toBe("123456");
    expect(cleanCode("12345")).toBeNull();
    expect(cleanCode("12a456")).toBeNull();
  });

  it("says what each code is for in the subject", () => {
    const base = { storeName: "MN Shoes & Watches", code: "482913" };
    expect(accountCodeSubject({ ...base, purpose: "sign-up" })).toBe("482913 is your code to finish creating your account at MN Shoes & Watches");
    expect(accountCodeSubject({ ...base, purpose: "reset" })).toBe("482913 is your code to set a new password at MN Shoes & Watches");
    expect(accountCodeSubject({ ...base, purpose: "sign-in" })).toBe("482913 is your sign-in code at MN Shoes & Watches");
  });
});
