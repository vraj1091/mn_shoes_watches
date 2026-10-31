import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/session";
import { messages, t } from "@/lib/i18n";
import { safeNextPath } from "@/lib/safe-redirect";
import { ResetPasswordForm } from "@/components/store/account/reset-password-form";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/account");
  if (await getCustomerSession()) redirect(next);
  const email = typeof params.email === "string" ? params.email.slice(0, 160) : "";

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      <div className="max-w-md">
        <h1 className="font-display text-4xl lg:text-5xl">{t("account.forgotTitle")}</h1>
        <p className="mt-4 text-lg text-muted">{t("account.forgotIntro")}</p>
        <div className="mt-8">
          <ResetPasswordForm labels={messages("account")} next={next} initialEmail={email} />
        </div>
      </div>
    </div>
  );
}
