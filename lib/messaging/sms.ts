import "server-only";
import { getIntegration } from "@/lib/integrations";
import { env } from "@/lib/env";

export { INDIAN_MOBILE } from "@/lib/format/phone";

export async function isPhoneLoginAvailable(): Promise<boolean> {
  return env().NODE_ENV !== "production" || (await getIntegration("MSG91")) !== null;
}

/**
 * Sends a sign-in code through MSG91's OTP API (v5). Better Auth generates and checks the code;
 * MSG91 only delivers it, using the DLT-approved template the owner registered with MSG91.
 */
export async function sendOtpSms(phoneNumber: string, code: string): Promise<void> {
  const msg91 = await getIntegration("MSG91");
  if (!msg91) {
    if (env().NODE_ENV === "production") throw new Error("Phone sign-in is not set up (MSG91).");
    console.info(`[sms] sign-in code for ${phoneNumber}: ${code}`);
    return;
  }

  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", msg91.secrets.otpTemplateId);
  url.searchParams.set("mobile", phoneNumber.replace(/^\+/, ""));
  url.searchParams.set("otp", code);
  url.searchParams.set("otp_expiry", "5");

  const response = await fetch(url, {
    method: "POST",
    headers: { authkey: msg91.secrets.authKey, "content-type": "application/json" },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => null)) as { type?: string; message?: string } | null;
  if (!response.ok || body?.type === "error") {
    throw new Error(`MSG91 did not accept the OTP request: ${body?.message ?? response.status}`);
  }
}
