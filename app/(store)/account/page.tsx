import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { SignOutIcon } from "@/components/icons";
import { SignOutButton } from "@/components/store/sign-out-button";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/sign-in?next=/account");
  const { name, email } = session.user;
  const isPhoneOnly = email.endsWith("@phone.invalid");

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      <h1 className="font-display text-4xl lg:text-5xl">{name || t("account.overviewTitle")}</h1>
      {!isPhoneOnly && <p className="mt-3 text-base text-muted">{t("account.signedInAs", { email })}</p>}
      <p className="measure mt-8 text-base">{t("account.ordersComing")}</p>
      <div className="mt-10">
        <SignOutButton label={t("common.signOut")} icon={<SignOutIcon size={20} />} />
      </div>
    </div>
  );
}
