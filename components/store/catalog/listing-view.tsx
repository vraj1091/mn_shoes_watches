import type { ReactNode } from "react";
import { toCards } from "@/lib/catalog/cards";
import { listingHref, PAGE_SIZE, priceSlug, type ListingState } from "@/lib/catalog/query";
import type { ResolvedListing, ScopeRef } from "@/lib/catalog/scope";
import { t } from "@/lib/i18n";
import { CloseIcon, FilterIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { ActiveFilters } from "./active-filters";
import { FilterFields } from "./filter-fields";
import { FilterForm } from "./filter-form";
import { FilterSheet } from "./filter-sheet";
import { LoadMore } from "./load-more";
import { Pagination } from "./pagination";
import { ProductCard, type CardLabels } from "./product-card";
import { SortControl } from "./sort-control";

export const GRID = "grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 xl:grid-cols-4";

export function cardLabels(): CardLabels {
  return {
    new: t("catalog.new"),
    soldOut: t("catalog.soldOut"),
    onlyLeft: t("catalog.onlyLeft"),
    percentOff: t("catalog.percentOff"),
    from: t("catalog.from"),
    moreSwatches: t("catalog.moreSwatches"),
    originalPrice: t("catalog.originalPrice"),
  };
}

/** The current filters as repeated params, for "Show more" to request the next page. */
function stateParams(state: ListingState): Record<string, string[]> {
  const params: Record<string, string[]> = { ...state.selections };
  if (state.price) params.price = [priceSlug(state.price)];
  if (state.inStock) params.in_stock = ["1"];
  params.sort = [state.sort];
  return params;
}

/**
 * Shared layout for category, collection, sale and search pages: toolbar, filters (sidebar on
 * desktop, sheet on phones), product grid, "Show more", page links, then whatever goes below.
 */
export function ListingView({
  listing,
  scope,
  header,
  below,
  empty,
}: {
  listing: ResolvedListing;
  scope: ScopeRef;
  header: ReactNode;
  below?: ReactNode;
  empty: ReactNode;
}) {
  const { basePath, state, result, defaultSort, index, scopeSize } = listing;
  const [action = basePath, baseQuery = ""] = basePath.split("?");
  const hidden = Object.fromEntries(new URLSearchParams(baseQuery));
  const labels = cardLabels();
  const cards = toCards(result.items, index.lowStockThreshold);
  const formKey = listingHref(basePath, state, defaultSort);
  const showFilters = scopeSize > 0;
  const count = result.total === 1 ? t("catalog.productCountOne") : t("catalog.productCount", { count: result.total });

  return (
    <div className="mx-auto max-w-screen-xl px-4 pt-6 pb-4 sm:px-6 lg:px-8 lg:pt-8">
      {header}

      {showFilters && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <p className="text-sm text-muted tabular-nums" aria-live="polite">
            {count}
          </p>
          <div className="flex items-center gap-2">
            <FilterSheet
              action={action}
              label={result.activeFilterCount ? t("catalog.filtersWithCount", { count: result.activeFilterCount }) : t("catalog.filters")}
              title={t("catalog.filters")}
              closeLabel={t("common.close")}
              closeIcon={<CloseIcon size={22} />}
              filterIcon={<FilterIcon size={18} />}
            >
              <div key={formKey} className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4">
                <FilterFields result={result} state={state} defaultSort={defaultSort} hidden={hidden} />
              </div>
              <div className="flex shrink-0 items-center gap-3 border-t border-line p-4">
                <a
                  href={listingHref(basePath, { ...state, selections: {}, price: null, inStock: false, page: 1 }, defaultSort)}
                  className={buttonClasses("ghost", "md")}
                >
                  {t("catalog.clearAll")}
                </a>
                <button type="submit" className={buttonClasses("primary", "md", "flex-1")}>
                  {t("catalog.applyFilters")}
                </button>
              </div>
            </FilterSheet>
            <SortControl action={action} state={state} hidden={hidden} />
          </div>
        </div>
      )}

      {result.activeFilterCount > 0 && (
        <div className="mt-4">
          <ActiveFilters basePath={basePath} state={state} result={result} defaultSort={defaultSort} />
        </div>
      )}

      <div className="mt-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        {showFilters && (
          <aside className="hidden lg:block" aria-label={t("catalog.filters")}>
            <FilterForm key={formKey} action={action} autoSubmit className="sticky top-24">
              <FilterFields result={result} state={state} defaultSort={defaultSort} hidden={hidden} />
              <button type="submit" className={buttonClasses("secondary", "md", "mt-2 w-full group-data-enhanced/filters:hidden")}>
                {t("catalog.applyFilters")}
              </button>
            </FilterForm>
          </aside>
        )}

        <div className={showFilters ? "" : "lg:col-span-2"}>
          {cards.length > 0 ? (
            <>
              {/* Keeps the heading order h1 → h2 → card titles (h3) for screen-reader navigation. */}
              <h2 className="sr-only">{t("catalog.productsHeading")}</h2>
              <ul className={GRID}>
                {cards.map((card, position) => (
                  <li key={card.id}>
                    <ProductCard product={card} labels={labels} eager={position < 4} />
                  </li>
                ))}
              </ul>
              <LoadMore
                key={formKey}
                scope={scope}
                params={stateParams(state)}
                page={result.page}
                pageCount={result.pageCount}
                shown={(result.page - 1) * PAGE_SIZE + cards.length}
                total={result.total}
                gridClass={GRID}
                labels={{ loadMore: t("catalog.loadMore"), loading: t("catalog.loadingMore"), shown: t("catalog.shown") }}
                cardLabels={labels}
              />
              <Pagination basePath={basePath} state={state} result={result} defaultSort={defaultSort} />
            </>
          ) : scopeSize > 0 ? (
            // Filters left nothing: a quiet box with the way back.
            <div className="rounded-md bg-subtle px-6 py-12 text-center">{empty}</div>
          ) : (
            // Nothing in this listing at all: the caller's message and suggestions.
            <div className="mt-2">{empty}</div>
          )}
        </div>
      </div>

      {below}
    </div>
  );
}
