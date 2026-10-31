"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { requireStaff } from "@/lib/auth/session";
import { ROLE_LABELS, STAFF_ROLES, isStaffRole } from "@/lib/auth/permissions";
import { audit } from "@/lib/admin/audit";
import { activeOwnerCount, hasPassword, revokeStaffLinks, sendStaffLink } from "@/lib/admin/staff";
import type { FormState } from "@/components/admin/forms";

/*
 * Staff accounts, Owner only (permission staff.manage). Guard rails so the shop can never lock
 * itself out: nobody changes their own role or switches themselves off, and the last owner who
 * can sign in can be neither demoted nor deactivated (DECISIONS.md 70).
 */

type Result = { ok: boolean; message: string };

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter their name.").max(80),
  email: z.email("Enter their email address.").max(254),
  role: z.enum(STAFF_ROLES, { message: "Choose a role." }),
});

export async function inviteStaff(_state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("staff.manage");
  const parsed = inviteSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) return { status: "error", message: "Please fix the following:", errors: parsed.error.issues.map((issue) => issue.message) };
  const { name, email, role } = parsed.data;
  const existing = await prisma.staffUser.findUnique({ where: { email }, select: { name: true } });
  if (existing) return { status: "error", message: `${email} already has a staff account (${existing.name}).` };

  const staff = await prisma.staffUser.create({ data: { storeId: DEFAULT_STORE_ID, name, email, role }, select: { id: true, email: true, role: true } });
  await audit(user.id, "staff.invite", { type: "staff", id: staff.id }, `Invited ${name} (${email}) as ${ROLE_LABELS[role]}.`);
  refresh();
  try {
    await sendStaffLink({ ...staff, role }, "invite", user.name);
  } catch (error) {
    console.error(`[staff] could not email the invite to ${email}`, error);
    return { status: "error", message: `${name} was added, but the invite email could not be sent. Check the email settings, then press “Send invite again” next to their name.` };
  }
  return { status: "saved", message: `Invite sent to ${email}. The link works for 3 days.` };
}

async function target(id: string) {
  return prisma.staffUser.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, select: { id: true, name: true, email: true, role: true, isActive: true } });
}

/** Sends a new set-password link: the invite again for someone who never set a password, a reset link otherwise. */
export async function sendPasswordLink(id: string): Promise<Result> {
  const { user } = await requireStaff("staff.manage");
  const staff = await target(id);
  if (!staff || !isStaffRole(staff.role)) return { ok: false, message: "This staff account no longer exists." };
  if (!staff.isActive) return { ok: false, message: `Switch ${staff.name}’s account back on first.` };
  const invite = !(await hasPassword(staff.id));
  try {
    await sendStaffLink({ ...staff, role: staff.role }, invite ? "invite" : "reset", user.name);
  } catch (error) {
    console.error(`[staff] could not email a password link to ${staff.email}`, error);
    return { ok: false, message: "The email could not be sent. Check the email settings and try again." };
  }
  await audit(user.id, invite ? "staff.invite" : "staff.password-link", { type: "staff", id }, `Sent ${staff.name} ${invite ? "a new invite" : "a link to set a new password"}.`);
  return { ok: true, message: invite ? `Invite sent again to ${staff.email}.` : `Password link sent to ${staff.email}. It works for 1 hour.` };
}

export async function changeStaffRole(id: string, role: string): Promise<Result> {
  const { user } = await requireStaff("staff.manage");
  if (!isStaffRole(role)) return { ok: false, message: "Choose a role." };
  if (id === user.id) return { ok: false, message: "You cannot change your own role. Another owner can." };
  const staff = await target(id);
  if (!staff || !isStaffRole(staff.role)) return { ok: false, message: "This staff account no longer exists." };
  if (staff.role === role) return { ok: true, message: `${staff.name} is already ${ROLE_LABELS[role]}.` };
  if (staff.role === "OWNER" && staff.isActive && (await hasPassword(staff.id)) && (await activeOwnerCount()) <= 1) {
    return { ok: false, message: "The shop needs at least one owner who can sign in." };
  }
  await prisma.staffUser.update({ where: { id }, data: { role } });
  refresh();
  await audit(user.id, "staff.role", { type: "staff", id }, `Changed ${staff.name}’s role from ${ROLE_LABELS[staff.role]} to ${ROLE_LABELS[role]}.`, { role: [staff.role, role] });
  return { ok: true, message: `${staff.name} is now ${ROLE_LABELS[role]}.` };
}

/** Switches an account off (signs them out everywhere and voids their links) or back on. */
export async function setStaffActive(id: string, active: boolean): Promise<Result> {
  const { user } = await requireStaff("staff.manage");
  if (id === user.id) return { ok: false, message: "You cannot switch off your own account." };
  const staff = await target(id);
  if (!staff) return { ok: false, message: "This staff account no longer exists." };
  if (staff.isActive === active) return { ok: true, message: `${staff.name}’s account is already ${active ? "on" : "off"}.` };
  if (!active && staff.role === "OWNER" && (await hasPassword(staff.id)) && (await activeOwnerCount()) <= 1) {
    return { ok: false, message: "The shop needs at least one owner who can sign in." };
  }
  await prisma.$transaction([
    prisma.staffUser.update({ where: { id }, data: { isActive: active } }),
    ...(active ? [] : [prisma.staffSession.deleteMany({ where: { userId: id } })]),
  ]);
  if (!active) await revokeStaffLinks(id);
  refresh();
  await audit(user.id, active ? "staff.reactivate" : "staff.deactivate", { type: "staff", id }, `${active ? "Switched back on" : "Switched off"} ${staff.name}’s account.`, { isActive: [!active, active] });
  return { ok: true, message: active ? `${staff.name} can sign in again.` : `${staff.name} is signed out and can no longer sign in.` };
}

/** For a lost phone: removes their authenticator and backup codes and signs them out. They set it up again at next sign-in. */
export async function resetStaffTwoFactor(id: string): Promise<Result> {
  const { user } = await requireStaff("staff.manage");
  if (id === user.id) return { ok: false, message: "Manage your own two-step sign-in on the My account page." };
  const staff = await target(id);
  if (!staff) return { ok: false, message: "This staff account no longer exists." };
  await prisma.$transaction([
    prisma.staffTwoFactor.deleteMany({ where: { userId: id } }),
    prisma.staffUser.update({ where: { id }, data: { twoFactorEnabled: false } }),
    prisma.staffSession.deleteMany({ where: { userId: id } }),
  ]);
  refresh();
  await audit(user.id, "staff.two-factor-reset", { type: "staff", id }, `Reset ${staff.name}’s two-step sign-in.`);
  return { ok: true, message: `${staff.name}’s authenticator is removed. They set up a new one when they next sign in.` };
}
