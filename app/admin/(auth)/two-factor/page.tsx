import type { Metadata } from "next";
import { messages, t } from "@/lib/i18n";
import { TwoFactorVerify } from "@/components/admin/two-factor-verify";

export const metadata: Metadata = { title: "Two-factor code" };

export default function TwoFactorPage() {
  return (
    <>
      <h1 className="font-display text-3xl">{t("admin.twoFactorTitle")}</h1>
      <p className="mt-2 mb-8 text-sm text-muted">{t("admin.twoFactorIntro")}</p>
      <TwoFactorVerify labels={messages("admin")} />
    </>
  );
}
