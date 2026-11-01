import type { CollectionPage } from "@/lib/data/catalog";
import { ancestors } from "@/lib/catalog/query";
import type { ResolvedListing, ScopeRef } from "@/lib/catalog/scope";
import { t } from "@/lib/i18n";
import { Breadcrumbs } from "./breadcrumbs";
import { ListingIntro } from "./listing-intro";
import { FaqList } from "./faq-list";
import { ListingView } from "./listing-view";

/** A collection page, used for /collections/{slug} and for landing paths such as /watches/under-10000. */
export function CollectionBody({
  collection,
  listing,
  scope,
}: {
  collection: CollectionPage;
  listing: ResolvedListing;
  scope: ScopeRef;
}) {
  const firstPage = listing.result.page === 1;
  // A landing path sits under its category (/watches/under-10000), so the trail runs through it.
  const segments = collection.landingPath?.split("/") ?? [];
  const parentPath = segments.slice(0, -1).join("/");
  const parent = parentPath ? listing.index.categories.find((node) => node.path === parentPath) : undefined;
  const trail = parent ? ancestors(listing.index.categories, parent.id).map((node) => ({ name: node.name, href: `/${node.path}` })) : [];
  return (
    <ListingView
      listing={listing}
      scope={scope}
      header={
        <header>
          <Breadcrumbs items={[...trail, { name: collection.title, href: collection.landingPath ? `/${collection.landingPath}` : `/collections/${collection.slug}` }]} />
          <h1 className="mt-3 font-display text-4xl lg:text-5xl">{collection.title}</h1>
          {firstPage && collection.intro && <ListingIntro text={collection.intro} labels={{ more: t("catalog.introMore"), less: t("catalog.introLess") }} />}
        </header>
      }
      empty={
        <>
          <p className="text-base font-medium">{t("catalog.noResults")}</p>
          <p className="mt-1 text-sm text-muted">{t("catalog.noResultsHint")}</p>
        </>
      }
      below={
        firstPage && collection.faqs.length > 0 ? (
          <div className="mt-20 border-t border-line pt-12">
            <FaqList title={t("catalog.faqTitle", { name: collection.title.toLowerCase() })} faqs={collection.faqs} />
          </div>
        ) : null
      }
    />
  );
}
