import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { messages, t } from "@/lib/i18n";
import { StaffSignIn } from "@/components/admin/staff-sign-in";

export const metadata: Metadata = { title: "Staff sign-in" };

export default async function AdminSignInPage() {
  if (await getStaffSession()) redirect("/admin");
  // Development only: which owner accounts exist, so a fresh checkout never guesses at the login.
  const owners =
    process.env.NODE_ENV === "production"
      ? []
      : await prisma.staffUser.findMany({ where: { storeId: DEFAULT_STORE_ID, role: "OWNER", isActive: true }, select: { email: true }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{t("admin.signInTitle")}</h1>
      <p className="mt-2 mb-8 text-sm text-muted">{t("admin.signInIntro")}</p>
      <StaffSignIn labels={messages("admin")} />
      {owners.length > 0 && (
        <aside className="mt-10 rounded-sm border border-dashed border-line-strong px-4 py-3 text-xs text-muted">
          <p className="font-semibold text-ink">Development only</p>
          <p className="mt-1">
            Owner {owners.length === 1 ? "account" : "accounts"}: {owners.map((owner) => owner.email).join(", ")}. The password is ADMIN_PASSWORD from .env, or the one
            in the README if you never set it. Locked out? Run <code className="font-mono">npm run admin:recover -- {owners[0]!.email}</code>.
          </p>
        </aside>
      )}
    </>
  );
}
