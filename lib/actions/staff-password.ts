"use server";

import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { isStaffRole } from "@/lib/auth/permissions";
import { hasPassword, sendStaffLink } from "@/lib/admin/staff";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import type { FormState } from "@/components/admin/forms";

const SENT = "If that email belongs to a staff account, a link to set a new password is on its way. It works for 1 hour.";

/**
 * "Forgot your password?" on the staff sign-in. The answer is the same whether or not the email
 * is a staff account, so the form cannot be used to find out who works here.
 */
export async function requestStaffPasswordReset(_state: FormState, formData: FormData): Promise<FormState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { status: "error", message: "Enter the email address you sign in with." };
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`staff-reset-ip:${await clientIp()}`, { windowSeconds: 15 * 60, max: 5 }),
    rateLimit(`staff-reset:${email.data}`, { windowSeconds: 60 * 60, max: 3 }),
  ]);
  if (!byIp.ok || !byEmail.ok) return { status: "error", message: "Too many requests. Wait a while, then try again." };

  const staff = await prisma.staffUser.findFirst({ where: { email: email.data, storeId: DEFAULT_STORE_ID, isActive: true }, select: { id: true, email: true, role: true } });
  if (staff && isStaffRole(staff.role)) {
    try {
      await sendStaffLink({ ...staff, role: staff.role }, (await hasPassword(staff.id)) ? "reset" : "invite");
    } catch (error) {
      console.error(`[staff] could not email a password link to ${staff.email}`, error);
      return { status: "error", message: "The email could not be sent. Try again later, or ask the shop owner to send you a link from the Staff page." };
    }
  }
  return { status: "saved", message: SENT };
}
