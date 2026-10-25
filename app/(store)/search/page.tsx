import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { getCategoryNavigation } from "@/lib/data/navigation";
import { resolveListing } from "@/lib/catalog/scope";
import { sortProducts, hasFilters } from "@/lib/catalog/query";
import { toCards } from "@/lib/catalog/cards";
import { recordSearch } from "@/lib/search/engine";
import { t } from "@/lib/i18n";
import { SearchIcon } from "@/components/icons";
import { ListingView } from "@/components/store/catalog/listing-view";
import { ProductRow } from "@/components/store/catalog/product-row";
import { SearchBox } from "@/components/store/search/search-box";
import { searchLabels } from "@/components/store/search/search-labels";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const readQuery = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 120) ?? "";

// Internal search results are kept out of search engines (Part 6); robots.txt blocks /search too.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = readQuery((await searchParams).q);
  return { title: q ? t("search.resultsFor", { q }) : t("search.title"), robots: { index: false, follow: true } };
}

async function Suggestions() {
  const [departments, index] = await Promise.all([getCategoryNavigation(), getCatalogIndex()]);
  const bestsellers = toCards(sortProducts(index.products, "bestselling").slice(0, 4), index.lowStockThreshold);
  const chips = departments.flatMap((department) => [
    { id: department.id, name: department.name, href: department.href, parent: null as string | null },
    ...department.children.slice(0, 3).map((child) => ({ id: child.id, name: child.name, href: child.href, parent: department.name })),
  ]);
  // "Men" alone is ambiguous when both Watches and Perfumes have it; those chips name their department.
  const repeated = new Set(chips.map((chip) => chip.name).filter((name, i, names) => names.indexOf(name) !== i));
  for (const chip of chips) if (!repeated.has(chip.name)) chip.parent = null;
  return (
    <>
      <section aria-labelledby="popular-heading" className="mt-12">
        <h2 id="popular-heading" className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          {t("search.popularCategories")}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.id}>
              <Link href={chip.href} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-line-strong px-4 text-sm hover:border-fg">
                {chip.name}
                {chip.parent && <span className="text-muted">· {chip.parent}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <ProductRow id="search-bestsellers" title={t("search.bestsellers")} products={bestsellers} />
    </>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = readQuery(params.q);
  const box = (autoFocus: boolean) => (
    <div className="max-w-2xl">
      <SearchBox labels={searchLabels()} defaultValue={q} autoFocus={autoFocus} icon={<SearchIcon size={20} />} />
    </div>
  );

  if (!q) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-display text-4xl lg:text-5xl">{t("search.emptyTitle")}</h1>
        {box(true)}
        <Suggestions />
      </div>
    );
  }

  const scope = { kind: "search" as const, q };
  const listing = await resolveListing(scope, params);
  if (!listing || listing.state.page !== listing.result.page) notFound();
  // Count the search after the response is sent; only first pages without filters, so each search counts once.
  if (listing.result.page === 1 && !hasFilters(listing.state)) {
    after(() => recordSearch(q, listing.result.total).catch((error: unknown) => console.error("[search] could not record", error)));
  }

  return (
    <ListingView
      listing={listing}
      scope={scope}
      header={
        <header>
          {box(false)}
          <h1 className="mt-8 font-display text-3xl lg:text-4xl">
            {listing.scopeSize === 0 ? t("search.noResults", { q }) : t("search.resultsFor", { q: listing.corrected ?? q })}
          </h1>
          {listing.corrected && <p className="mt-2 text-base text-muted">{t("search.showingCorrected", { q, corrected: listing.corrected })}</p>}
        </header>
      }
      empty={
        listing.scopeSize === 0 ? (
          <div className="text-left">
            <p className="text-base">{t("search.noResultsHint")}</p>
            <Suggestions />
          </div>
        ) : (
          <>
            <p className="text-base font-medium">{t("catalog.noResults")}</p>
            <p className="mt-1 text-sm text-muted">{t("catalog.noResultsHint")}</p>
          </>
        )
      }
    />
  );
}
