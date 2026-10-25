import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionBySlug } from "@/lib/data/catalog";
import { resolveListing } from "@/lib/catalog/scope";
import { describe, listingIndexing } from "@/lib/seo/listing";
import { CollectionBody } from "@/components/store/catalog/collection-body";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const collection = await getCollectionBySlug((await params).slug);
  if (!collection) return { robots: { index: false } };
  return {
    title: collection.metaTitle ?? collection.title,
    description: collection.metaDescription ?? describe(collection.intro),
    ...listingIndexing(`/collections/${collection.slug}`, await searchParams),
    ...(collection.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const collection = await getCollectionBySlug((await params).slug);
  if (!collection) notFound();
  // proxy.ts sends /collections/{slug} to the landing URL with a 301 when the collection has one.
  const scope = { kind: "collection" as const, slug: collection.slug };
  const listing = await resolveListing(scope, await searchParams);
  if (!listing || listing.state.page !== listing.result.page) notFound();
  return <CollectionBody collection={collection} listing={listing} scope={scope} />;
}
