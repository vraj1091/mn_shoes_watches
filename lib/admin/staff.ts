import "server-only";
import { randomBytes } from "node:crypto";
import { render } from "@react-email/render";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/messaging/email";
import { storeName } from "@/lib/auth/customer";
import { ROLE_LABELS, type StaffRoleName } from "@/lib/auth/permissions";
import { StaffLinkEmail, staffLinkSubject, staffLinkText, type StaffLinkPurpose } from "@/emails/staff-link";

/*
 * Staff passwords are only ever chosen by the staff member, through a one-time link (DECISIONS.md 70).
 * The link's token is stored the way Better Auth's /reset-password endpoint expects it
 * (identifier "reset-password:<token>", value = staff id), so that endpoint sets the password,
 * creates the login for a new invite, and signs the person out everywhere else.
 */

export const LINK_HOURS: Record<StaffLinkPurpose, number> = { invite: 72, reset: 1 };

const RESET_PREFIX = "reset-password:";

/** Deletes every unused set-password link of a staff member (on a new link, or when deactivated). */
export async function revokeStaffLinks(staffId: string) {
  await prisma.staffVerification.deleteMany({ where: { value: staffId, identifier: { startsWith: RESET_PREFIX } } });
}

/**
 * Creates a fresh set-password link for a staff member and emails it, replacing any earlier link.
 * Throws when the email cannot be sent; the link is then removed again, so nothing is left that
 * nobody received.
 */
export async function sendStaffLink(staff: { id: string; email: string; role: StaffRoleName }, purpose: StaffLinkPurpose, invitedBy?: string) {
  await revokeStaffLinks(staff.id);
  const token = randomBytes(32).toString("base64url");
  const hours = LINK_HOURS[purpose];
  const verification = await prisma.staffVerification.create({
    data: { identifier: `${RESET_PREFIX}${token}`, value: staff.id, expiresAt: new Date(Date.now() + hours * 3600_000) },
  });
  const link = `${env().APP_URL}/admin/set-password?token=${token}${purpose === "invite" ? "&welcome=1" : ""}`;
  const props = { storeName: await storeName(), purpose, link, hoursValid: hours, invitedBy, roleLabel: ROLE_LABELS[staff.role] };
  try {
    await sendEmail({ to: staff.email, subject: staffLinkSubject(props), html: await render(StaffLinkEmail(props)), text: staffLinkText(props) });
  } catch (error) {
    await prisma.staffVerification.delete({ where: { id: verification.id } });
    throw error;
  }
}

/** True when the staff member has chosen a password (an invite still open has none). */
export async function hasPassword(staffId: string): Promise<boolean> {
  return (await prisma.staffAccount.count({ where: { userId: staffId, providerId: "credential", password: { not: null } } })) > 0;
}

/** Active owners who can sign in. The last one can never be demoted or deactivated. */
export async function activeOwnerCount(): Promise<number> {
  return prisma.staffUser.count({
    where: { storeId: DEFAULT_STORE_ID, role: "OWNER", isActive: true, accounts: { some: { providerId: "credential", password: { not: null } } } },
  });
}
