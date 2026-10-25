"use client";

import { useActionState, useState, type ReactNode } from "react";
import { requestBackInStock, type NotifyState } from "@/lib/actions/catalog";
import {
  findVariant,
  isSizeOption,
  isValueAvailable,
  priceSummary,
  valueExists,
  type OptionDef,
  type Selection,
  type VariantDef,
} from "@/lib/catalog/variants";
import { formatPrice, percentOff } from "@/lib/format/money";
import { fill } from "@/lib/format/template";

export type BuyBoxLabels = {
  inclTaxes: string;
  emi: string;
  chooseOption: string;
  selectedValue: string;
  soldOutValue: string;
  inStock: string;
  onlyLeft: string;
  soldOut: string;
  sku: string;
  percentOff: string;
  originalPrice: string;
  from: string;
  notifyTitle: string;
  notifyIntro: string;
  notifyEmail: string;
  notifySubmit: string;
  notifyDone: string;
  notifyInvalid: string;
  notifyBusy: string;
  notifyError: string;
};

type Props = {
  options: OptionDef[];
  variants: VariantDef[];
  initial: Selection;
  lowStockThreshold: number;
  emiFrom: number;
  labels: BuyBoxLabels;
  /** Size guide trigger, rendered beside the size picker. */
  sizeGuide?: ReactNode;
};

/**
 * Price, options and stock for the product page. Sold-out values stay visible but struck through.
 * The chosen variant goes into ?variant= so a shared link opens the same size and colour; the
 * canonical URL stays the plain product URL. "Add to bag" joins in Phase 3.
 */
export function BuyBox({ options, variants, initial, lowStockThreshold, emiFrom, labels, sizeGuide }: Props) {
  const [selection, setSelection] = useState<Selection>(initial);
  const variant = findVariant(variants, options, selection);
  const summary = priceSummary(variants);
  const price = variant?.price ?? summary.price;
  const compareAt = variant ? (variant.compareAtPrice && variant.compareAtPrice > variant.price ? variant.compareAtPrice : null) : summary.compareAtPrice;
  const discount = percentOff(price, compareAt);
  const missing = options.find((option) => !selection[option.attributeId]);

  function choose(attributeId: string, valueId: string) {
    const next = { ...selection, [attributeId]: valueId };
    setSelection(next);
    const chosen = findVariant(variants, options, next);
    const url = new URL(window.location.href);
    if (chosen) url.searchParams.set("variant", chosen.id);
    else url.searchParams.delete("variant");
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <div>
      <div className="mt-4">
        <p className="flex flex-wrap items-baseline gap-x-3 tabular-nums">
          <span className={`price text-3xl font-semibold ${discount ? "text-sale" : "text-ink"}`}>
            {!variant && summary.from ? fill(labels.from, { price: formatPrice(price) }) : formatPrice(price)}
          </span>
          {compareAt && discount > 0 && (
            <>
              <s className="text-base text-muted">
                <span className="sr-only">{fill(labels.originalPrice, { price: formatPrice(compareAt) })}</span>
                <span aria-hidden>{formatPrice(compareAt)}</span>
              </s>
              <span className="text-base text-sale">{fill(labels.percentOff, { percent: discount })}</span>
            </>
          )}
        </p>
        <p className="mt-1 text-sm text-muted">{labels.inclTaxes}</p>
        {price >= emiFrom && <p className="mt-1 text-sm text-muted">{labels.emi}</p>}
      </div>

      {options.map((option) => {
        const chosen = option.values.find((value) => value.id === selection[option.attributeId]);
        return (
          <fieldset key={option.attributeId} className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <legend className="text-sm text-ink">
                {chosen ? fill(labels.selectedValue, { name: option.name, value: chosen.label }) : option.name}
              </legend>
              {isSizeOption(option) && sizeGuide}
            </div>
            <div className={`flex flex-wrap ${option.style === "SWATCH" ? "gap-3" : "gap-2"}`}>
              {option.values.map((value) => {
                const exists = valueExists(variants, selection, option.attributeId, value.id);
                const available = isValueAvailable(variants, selection, option.attributeId, value.id);
                const selected = selection[option.attributeId] === value.id;
                const name = available ? value.label : fill(labels.soldOutValue, { value: value.label });
                return (
                  <label
                    key={value.id}
                    className={
                      option.style === "SWATCH"
                        ? "relative flex size-11 cursor-pointer items-center justify-center rounded-full border border-transparent has-checked:border-ink has-focus-visible:outline-2 has-focus-visible:outline-link"
                        : `relative flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-sm border px-3 text-sm tabular-nums has-focus-visible:outline-2 has-focus-visible:outline-link ${
                            selected ? "border-ink bg-primary text-on-primary" : "border-line-strong text-ink hover:border-ink"
                          } ${available ? "" : "text-muted line-through decoration-1"} ${exists ? "" : "opacity-40"}`
                    }
                    title={option.style === "SWATCH" ? name : undefined}
                  >
                    <input
                      type="radio"
                      name={option.attributeId}
                      value={value.id}
                      checked={selected}
                      onChange={() => choose(option.attributeId, value.id)}
                      aria-label={name}
                      className="sr-only"
                    />
                    {option.style === "SWATCH" ? (
                      <span
                        aria-hidden
                        className={`size-8 rounded-full border border-line-strong ${available ? "" : "opacity-40"}`}
                        style={{ backgroundColor: value.hex ?? undefined }}
                      />
                    ) : (
                      <span aria-hidden>{value.label.replace(/^UK /, "")}</span>
                    )}
                    {option.style === "SWATCH" && !available && (
                      <span aria-hidden className="absolute h-px w-9 rotate-45 bg-muted" />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="mt-6 min-h-6 text-sm" role="status" aria-live="polite">
        {!variant ? (
          missing && (
            // "Size (UK/India)" reads as "size" in the sentence.
            <span className="text-muted">{fill(labels.chooseOption, { name: missing.name.replace(/\s*\(.*\)$/, "").toLowerCase() })}</span>
          )
        ) : variant.stock === 0 ? (
          <span className="font-medium text-ink">{labels.soldOut}</span>
        ) : variant.stock <= lowStockThreshold ? (
          <span className="font-medium text-sale">{fill(labels.onlyLeft, { count: variant.stock })}</span>
        ) : (
          <span className="font-medium text-stock">{labels.inStock}</span>
        )}
        {variant && <span className="ml-3 text-muted">{fill(labels.sku, { sku: variant.sku })}</span>}
      </div>

      {variant && variant.stock === 0 && <NotifyMe variant={variant} labels={labels} />}
    </div>
  );
}

function NotifyMe({ variant, labels }: { variant: VariantDef; labels: BuyBoxLabels }) {
  const [state, action, pending] = useActionState<NotifyState, FormData>(requestBackInStock, { status: "idle" });
  if (state.status === "done") {
    return <p className="mt-4 rounded-sm bg-surface px-4 py-3 text-sm text-stock">{labels.notifyDone}</p>;
  }
  const message =
    state.status === "invalid" ? labels.notifyInvalid : state.status === "busy" ? labels.notifyBusy : state.status === "error" ? labels.notifyError : null;
  return (
    <form action={action} className="mt-4 rounded-md border border-line p-4">
      <p className="text-base font-medium">{labels.notifyTitle}</p>
      <p className="mt-1 text-sm text-muted">{fill(labels.notifyIntro, { variant: variant.title })}</p>
      <input type="hidden" name="variantId" value={variant.id} />
      <div className="mt-3 flex gap-2">
        <label htmlFor="notify-email" className="sr-only">
          {labels.notifyEmail}
        </label>
        <input
          id="notify-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={labels.notifyEmail}
          className="block min-h-11 w-full rounded-sm border border-line-strong bg-canvas px-3 text-base text-ink placeholder:text-muted focus-visible:border-ink"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 shrink-0 rounded-sm bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
        >
          {labels.notifySubmit}
        </button>
      </div>
      {message && (
        <p role="alert" className="mt-2 text-sm text-sale">
          {message}
        </p>
      )}
    </form>
  );
}
