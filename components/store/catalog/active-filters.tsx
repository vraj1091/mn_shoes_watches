import Link from "next/link";
import { listingHref, toggleSelection, type ListingResult, type ListingState, type SortKey } from "@/lib/catalog/query";
import { t } from "@/lib/i18n";
import { CloseIcon } from "@/components/icons";
import { priceLabel } from "./filter-fields";

/** Chips for the filters in use (Cognac, per Part 3), each a link that removes itself. */
export function ActiveFilters({
  basePath,
  state,
  result,
  defaultSort,
}: {
  basePath: string;
  state: ListingState;
  result: ListingResult;
  defaultSort: SortKey;
}) {
  const chips: { label: string; href: string }[] = [];
  for (const facet of result.facets) {
    for (const value of facet.values.filter((item) => item.selected)) {
      chips.push({
        label: value.label,
        href: listingHref(basePath, state, defaultSort, { selections: toggleSelection(state, facet.key, value.slug), page: 1 }),
      });
    }
  }
  if (state.price) chips.push({ label: priceLabel(state.price), href: listingHref(basePath, state, defaultSort, { price: null, page: 1 }) });
  if (state.inStock) chips.push({ label: t("catalog.inStockOnly"), href: listingHref(basePath, state, defaultSort, { inStock: false, page: 1 }) });
  if (chips.length === 0) return null;

  const clearAll = listingHref(basePath, { ...state, selections: {}, price: null, inStock: false, page: 1 }, defaultSort);
  return (
    <div aria-label={t("catalog.activeFilters")} role="group" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.href}
          href={chip.href}
          scroll={false}
          aria-label={t("catalog.removeFilter", { label: chip.label })}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-accent px-3 text-sm text-accent hover:bg-accent-soft"
        >
          {chip.label}
          <CloseIcon size={14} />
        </Link>
      ))}
      <Link href={clearAll} scroll={false} className="inline-flex min-h-11 items-center px-2 text-sm text-muted underline underline-offset-4 hover:text-fg">
        {t("catalog.clearAll")}
      </Link>
    </div>
  );
}
