import type { ListingResult, ListingState, PriceRange, SortKey } from "@/lib/catalog/query";
import { formatPrice } from "@/lib/format/money";
import { t } from "@/lib/i18n";

export function priceLabel(range: PriceRange): string {
  if (range.min === 0 && range.max !== null) return t("catalog.priceUnder", { max: formatPrice(range.max) });
  if (range.max === null) return t("catalog.priceOver", { min: formatPrice(range.min) });
  return t("catalog.priceBetween", { min: formatPrice(range.min), max: formatPrice(range.max) });
}

const legend = "mb-2 text-sm font-semibold text-ink";
const row =
  "flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink has-disabled:cursor-not-allowed has-disabled:text-muted";
const box = "size-5 shrink-0 accent-[var(--link)]";

/**
 * The filter fields, rendered on the server with live counts. Used inside the desktop sidebar and
 * the phone sheet. Values that would give no results are disabled, not hidden, so the list does
 * not jump around as filters change.
 */
export function FilterFields({
  result,
  state,
  defaultSort,
  hidden = {},
}: {
  result: ListingResult;
  state: ListingState;
  defaultSort: SortKey;
  hidden?: Record<string, string>;
}) {
  return (
    <>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state.sort !== defaultSort && <input type="hidden" name="sort" value={state.sort} />}

      {result.facets.map((facet) => (
        <fieldset key={facet.key} className="border-b border-line py-4 first:pt-0">
          <legend className={legend}>{facet.label}</legend>
          <ul>
            {facet.values.map((value) => (
              <li key={value.slug}>
                <label className={row}>
                  <input
                    type="checkbox"
                    name={facet.key}
                    value={value.slug}
                    defaultChecked={value.selected}
                    disabled={value.count === 0 && !value.selected}
                    className={box}
                  />
                  {value.swatchHex && (
                    <span aria-hidden className="size-4 shrink-0 rounded-full border border-line-strong" style={{ backgroundColor: value.swatchHex }} />
                  )}
                  <span className="min-w-0 flex-1 break-words">{value.label}</span>
                  <span className="text-muted tabular-nums">{value.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      {result.priceBuckets.length > 0 && (
        <fieldset className="border-b border-line py-4">
          <legend className={legend}>{t("catalog.price")}</legend>
          <ul>
            <li>
              <label className={row}>
                <input type="radio" name="price" value="" defaultChecked={!state.price} className={box} />
                <span className="flex-1">{t("catalog.anyPrice")}</span>
              </label>
            </li>
            {result.priceBuckets.map((bucket) => (
              <li key={bucket.slug}>
                <label className={row}>
                  <input type="radio" name="price" value={bucket.slug} defaultChecked={bucket.selected} disabled={bucket.count === 0 && !bucket.selected} className={box} />
                  <span className="flex-1">{priceLabel(bucket.range)}</span>
                  <span className="text-muted tabular-nums">{bucket.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset className="py-4">
        <legend className={legend}>{t("catalog.availability")}</legend>
        <label className={row}>
          <input type="checkbox" name="in_stock" value="1" defaultChecked={state.inStock} className={box} />
          <span className="flex-1">{t("catalog.inStockOnly")}</span>
          <span className="text-muted tabular-nums">{result.inStockCount}</span>
        </label>
      </fieldset>
    </>
  );
}
