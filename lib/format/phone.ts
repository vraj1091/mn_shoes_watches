/** Indian mobile numbers in E.164: +91 followed by 10 digits starting 6–9. */
export const INDIAN_MOBILE = /^\+91[6-9]\d{9}$/;

/** Accepts "98765 43210", "+91 98765-43210" or "919876543210"; returns +919876543210 or null. */
export function normaliseIndianMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  const e164 = `+91${local}`;
  return INDIAN_MOBILE.test(e164) ? e164 : null;
}

/** +919876543210 → "+91 98765 43210" */
export function formatIndianMobile(e164: string): string {
  const local = e164.replace(/^\+91/, "");
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : e164;
}
