import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { getCategoryByPath, getCollectionByLandingPath, type CategoryPage, type CollectionPage } from "@/lib/data/catalog";
import { ancestors, descendantIds, productsInCategories } from "@/lib/catalog/query";
import { resolveListing } from "@/lib/catalog/scope";
import { describe, listingIndexing } from "@/lib/seo/listing";
import { t } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import { FaqList } from "@/components/store/catalog/faq-list";
import { CollectionBody } from "@/components/store/catalog/collection-body";
import { ListingView } from "@/components/store/catalog/listing-view";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ path: string[] }>; searchParams: Promise<SearchParams> };

const joinPath = (segments: string[]) => segments.map((segment) => decodeURIComponent(segment)).join("/");

/*
 * Category pages for every level of the tree (/mens-shoes, /mens-shoes/formal/oxfords) and
 * collection landing pages (/watches/under-10000). Fixed routes such as /product and /search
 * always win over this catch-all, and proxy.ts answers unknown paths with a real 404.
 */

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const path = joinPath((await params).path);
  const query = await searchParams;
  const category = await getCategoryByPath(path);
  if (category) {
    const index = await getCatalogIndex();
    const trail = ancestors(index.categories, category.id).map((node) => node.name).reverse();
    const indexing = listingIndexing(`/${path}`, query);
    return {
      title: category.metaTitle ?? trail.join(" – "),
      description: category.metaDescription ?? describe(category.intro),
      ...indexing,
      ...(category.noindex ? { robots: { index: false, follow: true } } : {}),
    };
  }
  const collection = await getCollectionByLandingPath(path);
  if (collection) {
    return {
      title: collection.metaTitle ?? collection.title,
      description: collection.metaDescription ?? describe(collection.intro),
      ...listingIndexing(`/${path}`, query),
      ...(collection.noindex ? { robots: { index: false, follow: true } } : {}),
    };
  }
  return { title: t("notFound.metaTitle"), robots: { index: false } };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const path = joinPath((await params).path);
  const query = await searchParams;
  const category = await getCategoryByPath(path);
  if (category) return <CategoryListing category={category} path={path} query={query} />;
  const collection = await getCollectionByLandingPath(path);
  if (collection) return <CollectionListing collection={collection} path={path} query={query} />;
  notFound();
}

async function CategoryListing({ category, path, query }: { category: CategoryPage; path: string; query: SearchParams }) {
  const scope = { kind: "category" as const, path };
  const listing = await resolveListing(scope, query);
  if (!listing || listing.state.page !== listing.result.page) notFound();

  const trail = ancestors(listing.index.categories, category.id);
  const parent = trail.at(-2);
  const children = listing.index.categories.filter((node) => node.parentId === category.id).sort((a, b) => a.position - b.position);
  const firstPage = listing.result.page === 1;
  // Nothing filed here yet: point to sibling categories that have products, then the parent's siblings.
  const hasProducts = (id: string) => productsInCategories(listing.index.products, descendantIds(listing.index.categories, id)).length > 0;
  const related =
    listing.scopeSize === 0
      ? [
          ...listing.index.categories.filter((node) => node.parentId === (parent?.id ?? null) && node.id !== category.id),
          ...listing.index.categories.filter((node) => parent && node.parentId === parent.parentId && node.id !== parent.id),
        ]
          .filter((node) => hasProducts(node.id))
          .slice(0, 6)
      : [];

  return (
    <ListingView
      listing={listing}
      scope={scope}
      header={
        <header>
          <Breadcrumbs items={trail.map((node) => ({ name: node.name, href: `/${node.path}` }))} />
          <h1 className="mt-3 font-display text-4xl lg:text-5xl">{category.name}</h1>
          {firstPage && category.intro && <p className="measure mt-4 text-base text-ink lg:text-lg">{category.intro}</p>}
          {children.length > 0 && (
            <nav aria-label={t("catalog.browse")} className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <ul className="flex gap-2 sm:flex-wrap">
                {children.map((child) => (
                  <li key={child.id} className="shrink-0">
                    <Link
                      href={`/${child.path}`}
                      className="inline-flex min-h-11 items-center rounded-sm border border-line-strong px-4 text-sm text-ink hover:border-ink"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </header>
      }
      empty={
        listing.scopeSize === 0 ? (
          <div>
            <p className="text-base">
              {t("catalog.emptyCategory", { name: parent?.name ?? category.name })}{" "}
              {parent && (
                <Link href={`/${parent.path}`} className="text-link hover:text-accent underline underline-offset-4">
                  {parent.name}
                </Link>
              )}
            </p>
            {related.length > 0 && (
              <nav aria-label={t("catalog.relatedCategories")} className="mt-6">
                <p className="text-sm font-semibold">{t("catalog.relatedCategories")}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {related.map((node) => (
                    <li key={node.id}>
                      <Link href={`/${node.path}`} className="inline-flex min-h-11 items-center rounded-sm border border-line-strong px-4 text-sm hover:border-ink">
                        {node.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        ) : (
          <>
            <p className="text-base font-medium">{t("catalog.noResults")}</p>
            <p className="mt-1 text-sm text-muted">{t("catalog.noResultsHint")}</p>
          </>
        )
      }
      below={
        firstPage && (category.buyingGuideHtml || category.faqs.length > 0) ? (
          <div className="mt-20 grid gap-16 border-t border-line pt-12 lg:grid-cols-2">
            {category.buyingGuideHtml && (
              <section aria-labelledby="guide-heading" className="measure">
                <h2 id="guide-heading" className="font-display text-2xl lg:text-3xl">
                  {t("catalog.guideTitle")}
                </h2>
                {/* Sanitised when saved in the admin (Phase 4). */}
                <div className="rich-text mt-4" dangerouslySetInnerHTML={{ __html: category.buyingGuideHtml }} />
              </section>
            )}
            <FaqList title={t("catalog.faqTitle", { name: category.name.toLowerCase() })} faqs={category.faqs} />
          </div>
        ) : null
      }
    />
  );
}

async function CollectionListing({ collection, path, query }: { collection: CollectionPage; path: string; query: SearchParams }) {
  const scope = { kind: "landing" as const, path };
  const listing = await resolveListing(scope, query);
  if (!listing || listing.state.page !== listing.result.page) notFound();
  return <CollectionBody collection={collection} listing={listing} scope={scope} />;
}
