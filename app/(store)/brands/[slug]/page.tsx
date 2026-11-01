import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrands } from "@/lib/data/content";
import { resolveListing } from "@/lib/catalog/scope";
import { describe, listingIndexing } from "@/lib/seo/listing";
import { t } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import { ListingIntro } from "@/components/store/catalog/listing-intro";
import { ListingView } from "@/components/store/catalog/listing-view";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

async function findBrand(params: Props["params"]) {
  const slug = decodeURIComponent((await params).slug);
  return (await getBrands()).find((brand) => brand.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const brand = await findBrand(params);
  if (!brand) return { title: t("notFound.metaTitle"), robots: { index: false } };
  return {
    title: brand.metaTitle ?? brand.name,
    description: brand.metaDescription ?? describe(brand.intro),
    ...listingIndexing(`/brands/${brand.slug}`, await searchParams),
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const brand = await findBrand(params);
  if (!brand) notFound();
  const scope = { kind: "brand" as const, slug: brand.slug };
  const listing = await resolveListing(scope, await searchParams);
  if (!listing || listing.state.page !== listing.result.page) notFound();
  return (
    <ListingView
      listing={listing}
      scope={scope}
      header={
        <header>
          <Breadcrumbs items={[{ name: t("brands.title"), href: "/brands" }, { name: brand.name, href: `/brands/${brand.slug}` }]} />
          <h1 className="mt-3 font-display text-4xl lg:text-5xl">{brand.name}</h1>
          {listing.result.page === 1 && brand.intro && <ListingIntro text={brand.intro} labels={{ more: t("catalog.introMore"), less: t("catalog.introLess") }} />}
        </header>
      }
      empty={
        <>
          <p className="text-base font-medium">{t("catalog.noResults")}</p>
          <p className="mt-1 text-sm text-muted">{t("catalog.noResultsHint")}</p>
        </>
      }
    />
  );
}
