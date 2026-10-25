import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { messages, t } from "@/lib/i18n";
import { StaffSignIn } from "@/components/admin/staff-sign-in";

export const metadata: Metadata = { title: "Staff sign-in" };

export default async function AdminSignInPage() {
  if (await getStaffSession()) redirect("/admin");
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{t("admin.signInTitle")}</h1>
      <p className="mt-2 mb-8 text-sm text-muted">{t("admin.signInIntro")}</p>
      <StaffSignIn labels={messages("admin")} />
    </>
  );
}
