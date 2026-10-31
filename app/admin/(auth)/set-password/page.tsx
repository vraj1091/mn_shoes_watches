import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db/client";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { SetPasswordForm } from "@/components/admin/set-password-form";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Set your password", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Opened from an invite or reset email (lib/admin/staff.ts). The link is checked before the form shows. */
export default async function SetStaffPasswordPage({ searchParams }: Props) {
  const { token, welcome } = await searchParams;
  await connection(); // the expiry check uses the current time
  const value = typeof token === "string" ? token : "";
  const link = value ? await prisma.staffVerification.findFirst({ where: { identifier: `reset-password:${value}` }, select: { value: true, expiresAt: true } }) : null;
  const staff =
    link && link.expiresAt > new Date() ? await prisma.staffUser.findUnique({ where: { id: link.value }, select: { name: true, email: true, isActive: true } }) : null;

  if (!staff?.isActive) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">This link no longer works</h1>
        <div className="mt-6">
          <FormAlert>Links to set a password work once, for a limited time. This one has expired, was already used, or a newer link was sent.</FormAlert>
        </div>
        <p className="mt-6 text-sm">
          <Link href="/admin/forgot-password" className="inline-flex min-h-11 items-center text-link underline underline-offset-4">
            Email me a new link
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{welcome ? `Welcome, ${staff.name}` : "Set a new password"}</h1>
      <p className="mt-2 mb-8 text-sm text-muted">
        {welcome ? "Choose a password for your staff account " : "Choose a new password for "}
        <strong className="font-medium text-ink">{staff.email}</strong>.
      </p>
      <SetPasswordForm token={value} email={staff.email} minLength={MIN_PASSWORD_LENGTH} />
    </>
  );
}
