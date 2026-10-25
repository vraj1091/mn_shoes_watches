import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveListing } from "@/lib/catalog/scope";
import { listingIndexing } from "@/lib/seo/listing";
import { t } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import { ListingView } from "@/components/store/catalog/listing-view";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: t("catalog.saleTitle"), description: t("catalog.saleIntro"), ...listingIndexing("/sale", await searchParams) };
}

export default async function SalePage({ searchParams }: Props) {
  const scope = { kind: "sale" as const };
  const listing = await resolveListing(scope, await searchParams);
  if (!listing || listing.state.page !== listing.result.page) notFound();
  return (
    <ListingView
      listing={listing}
      scope={scope}
      header={
        <header>
          <Breadcrumbs items={[{ name: t("catalog.saleTitle"), href: "/sale" }]} />
          <h1 className="mt-3 font-display text-4xl lg:text-5xl">{t("catalog.saleTitle")}</h1>
          <p className="measure mt-4 text-base lg:text-lg">{t("catalog.saleIntro")}</p>
        </header>
      }
      empty={<p className="text-base">{listing.scopeSize === 0 ? t("catalog.saleEmpty") : t("catalog.noResults")}</p>}
    />
  );
}
