import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/session";
import { isPhoneLoginAvailable } from "@/lib/messaging/sms";
import { env } from "@/lib/env";
import { messages, t } from "@/lib/i18n";
import { safeNextPath } from "@/lib/safe-redirect";
import { EmailIcon, GoogleIcon, MobileIcon } from "@/components/icons";
import { CustomerSignIn } from "@/components/store/customer-sign-in";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignInPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next, "/account");
  if (await getCustomerSession()) redirect(next);

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env();

  return (
    <div className="mx-auto grid max-w-screen-xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-20">
      <div className="lg:col-span-5">
        <h1 className="font-display text-4xl lg:text-5xl">{t("account.signInTitle")}</h1>
        <p className="mt-4 text-lg text-muted">{t("account.signInIntro")}</p>
        <div className="mt-8 max-w-md">
          <CustomerSignIn
            labels={messages("account")}
            next={next}
            googleEnabled={Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)}
            phoneEnabled={await isPhoneLoginAvailable()}
            icons={{ email: <EmailIcon size={20} />, phone: <MobileIcon size={20} />, google: <GoogleIcon size={20} /> }}
          />
        </div>
      </div>
      <aside className="self-start rounded-md bg-surface p-6 text-base lg:col-span-4 lg:col-start-9 lg:mt-20">
        <p>{t("account.guestNote")}</p>
      </aside>
    </div>
  );
}
