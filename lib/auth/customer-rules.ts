import { normaliseIndianMobile } from "@/lib/format/phone";

/*
 * Rules for customer accounts, shared by the forms (instant messages) and the server (the check
 * that counts). Pure functions, no server imports, so the browser can use them too.
 */

export const CUSTOMER_PASSWORD_MIN = 8;
export const CUSTOMER_PASSWORD_MAX = 128;
export const CODE_RESEND_SECONDS = 60;

/** Rate-limit key for the one-minute wait between codes, per email and kind of code. */
export function codeCooldownKey(type: string, email: string): string {
  return `code-send:${type}:${email.toLowerCase()}`;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Passwords people pick first, including the Indian favourites that top breach lists. A long
 * list belongs in a breach check; this one stops the obvious ones without a network call.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890", "11111111", "00000000",
  "87654321", "12341234", "qwertyui", "qwerty123", "qwerty12", "asdfghjk", "iloveyou", "iloveyou1", "abcd1234",
  "abc12345", "letmein1", "welcome1", "welcome123", "admin123", "india123", "india@123", "bharat123", "sairam123",
  "krishna123", "omsairam", "jaishriram", "jaihind123", "ganesh123", "mumbai123", "gujarat123", "kalol123",
  "shoes123", "watches123", "mnshoes123", "computer", "sunshine", "princess", "football", "cricket1", "cricket123",
  "baseball", "superman", "trustno1", "monkey123", "dragon123", "123qweasd", "1q2w3e4r", "zaq12wsx",
]);

export type PasswordProblem = "TOO_SHORT" | "TOO_LONG" | "TOO_COMMON" | "CONTAINS_EMAIL";

export function passwordProblem(password: string, { email = "" }: { email?: string } = {}): PasswordProblem | null {
  if (password.length < CUSTOMER_PASSWORD_MIN) return "TOO_SHORT";
  if (password.length > CUSTOMER_PASSWORD_MAX) return "TOO_LONG";
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(password) || /^(0123456789|1234567890|9876543210)/.test(password)) return "TOO_COMMON";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return "CONTAINS_EMAIL";
  return null;
}

/**
 * 0 = nothing typed, 1 = weak, 2 = fair, 3 = good, 4 = strong. Length counts most; mixing
 * letters, digits and symbols adds a little. Only a hint: the rule that blocks is passwordProblem.
 */
export function passwordStrength(password: string, context: { email?: string } = {}): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  if (passwordProblem(password, context)) return 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  const score = (password.length >= 16 ? 3 : password.length >= 12 ? 2 : 1) + (kinds >= 3 ? 1 : 0);
  return Math.min(4, Math.max(2, score)) as 2 | 3 | 4;
}

export type SignUpField = "name" | "email" | "phone" | "password";
export type SignUpProblem = "REQUIRED" | "INVALID" | PasswordProblem;
export type SignUpInput = { name: string; email: string; phone: string; password: string };
export type SignUpValues = { name: string; email: string; phone: string; password: string };

/** Checks the sign-up form. Returns cleaned values (trimmed name, lower-case email, +91 phone). */
export function validateSignUp(input: SignUpInput): { values: SignUpValues; errors: Partial<Record<SignUpField, SignUpProblem>> } {
  const errors: Partial<Record<SignUpField, SignUpProblem>> = {};
  const name = input.name.replace(/\s+/g, " ").trim();
  const email = input.email.trim().toLowerCase();
  const phone = normaliseIndianMobile(input.phone) ?? "";

  if (!name) errors.name = "REQUIRED";
  else if (name.length < 2 || name.length > 80 || !/\p{L}/u.test(name)) errors.name = "INVALID";
  if (!email) errors.email = "REQUIRED";
  else if (!EMAIL_PATTERN.test(email) || email.length > 160) errors.email = "INVALID";
  if (!input.phone.trim()) errors.phone = "REQUIRED";
  else if (!phone) errors.phone = "INVALID";
  if (!input.password) errors.password = "REQUIRED";
  else {
    const problem = passwordProblem(input.password, { email });
    if (problem) errors.password = problem;
  }
  return { values: { name, email, phone, password: input.password }, errors };
}

/** A 6-digit code as typed (spaces and dashes allowed), or null. */
export function cleanCode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}
