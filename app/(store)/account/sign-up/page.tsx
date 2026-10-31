import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/session";
import { messages, t } from "@/lib/i18n";
import { safeNextPath } from "@/lib/safe-redirect";
import { SignUpForm } from "@/components/store/account/sign-up-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignUpPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next, "/account");
  if (await getCustomerSession()) redirect(next);

  const [before, middle, after] = t("account.terms").split(/\{terms\}|\{privacy\}/);
  const terms = (
    <>
      {before}
      <Link href="/policies/terms" className="text-link underline underline-offset-4">
        {t("account.termsLink")}
      </Link>
      {middle}
      <Link href="/policies/privacy" className="text-link underline underline-offset-4">
        {t("account.privacyLink")}
      </Link>
      {after}
    </>
  );

  return (
    <div className="mx-auto grid max-w-screen-xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-20">
      <div className="lg:col-span-5">
        <h1 className="font-display text-4xl lg:text-5xl">{t("account.signUpTitle")}</h1>
        <p className="mt-4 text-lg text-muted">{t("account.signUpIntro")}</p>
        <div className="mt-8 max-w-md">
          <SignUpForm labels={messages("account")} next={next} terms={terms} />
        </div>
      </div>
      <aside className="self-start rounded-md bg-surface p-6 text-base lg:col-span-4 lg:col-start-9 lg:mt-20">
        <p>{t("account.guestNote")}</p>
      </aside>
    </div>
  );
}
