import { SORTS, priceSlug, type ListingState, type SortKey } from "@/lib/catalog/query";
import { t, type MessageKey } from "@/lib/i18n";
import { FilterForm } from "./filter-form";

const SORT_LABELS: Record<SortKey, MessageKey> = {
  relevance: "catalog.sortRelevance",
  newest: "catalog.sortNewest",
  "price-asc": "catalog.sortPriceAsc",
  "price-desc": "catalog.sortPriceDesc",
  bestselling: "catalog.sortBestselling",
};

/** Sort select. Carries the current filters as hidden fields, so sorting never clears them. */
export function SortControl({ action, state, hidden = {} }: { action: string; state: ListingState; hidden?: Record<string, string> }) {
  return (
    <FilterForm action={action} autoSubmit className="flex items-center gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {Object.entries(state.selections).flatMap(([key, values]) =>
        values.map((value) => <input key={`${key}=${value}`} type="hidden" name={key} value={value} />),
      )}
      {state.price && <input type="hidden" name="price" value={priceSlug(state.price)} />}
      {state.inStock && <input type="hidden" name="in_stock" value="1" />}
      <label htmlFor="sort" className="text-sm text-muted max-sm:sr-only">
        {t("catalog.sortBy")}
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={state.sort}
        className="min-h-11 rounded-sm border border-line-strong bg-surface py-0 pr-8 pl-3 text-sm text-ink hover:border-ink"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(SORT_LABELS[sort])}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="min-h-11 rounded-sm border border-line-strong px-3 text-sm">
          {t("catalog.applyFilters")}
        </button>
      </noscript>
    </FilterForm>
  );
}
