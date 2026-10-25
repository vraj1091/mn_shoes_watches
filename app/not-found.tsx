import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/**
 * Fallback for URLs outside the shop's routes (shop URLs get app/(store)/not-found.tsx with the
 * full header and footer). Next.js embeds this component in every page's payload as a ready
 * fallback, so it is deliberately small: a full header and footer here doubled every page's size.
 */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-screen-md px-4 py-24">
      <p className="text-sm tracking-[0.14em] text-muted uppercase">404</p>
      <h1 className="mt-3 font-display text-4xl">{t("notFound.title")}</h1>
      <p className="mt-4 text-lg text-muted">{t("notFound.intro")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonClasses()}>
          {t("common.backToShop")}
        </Link>
        <Link href="/search" className={buttonClasses("secondary")}>
          {t("common.search")}
        </Link>
      </div>
    </main>
  );
}
