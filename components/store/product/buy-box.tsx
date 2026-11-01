"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { addToCart } from "@/lib/actions/shop";
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
import { scrollBehavior } from "@/lib/design/motion";
import { formatPrice, percentOff } from "@/lib/format/money";
import { fill } from "@/lib/format/template";
import { buttonClasses } from "@/components/ui/button";
import { cartStore } from "@/components/store/shop/store";

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
  addToBag: string;
  adding: string;
  buyNow: string;
  chooseFirst: string;
  added: string;
  soldOutNow: string;
  limit: string;
  busy: string;
};

type Props = {
  title: string;
  options: OptionDef[];
  variants: VariantDef[];
  initial: Selection;
  lowStockThreshold: number;
  emiFrom: number;
  labels: BuyBoxLabels;
  /** Size guide trigger, rendered beside the size picker. */
  sizeGuide?: ReactNode;
  /** Wishlist heart, next to the buttons. */
  wishlist?: ReactNode;
  /** PIN-code delivery check, under the buttons. */
  delivery?: ReactNode;
  /** Status icons beside the stock line: status colours always come with an icon and words. */
  stockIcons: { inStock: ReactNode; low: ReactNode };
};

const shortName = (option: OptionDef) => option.name.replace(/\s*\(.*\)$/, "").toLowerCase();

/**
 * Price, options, stock and the buttons for the product page. Sold-out values stay visible but
 * struck through. The chosen variant goes into ?variant= so a shared link opens the same size and
 * colour; the canonical URL stays the plain product URL. On phones a bar with the price and
 * "Add to bag" stays at the bottom once the main button scrolls out of view.
 */
export function BuyBox({ title, options, variants, initial, lowStockThreshold, emiFrom, labels, sizeGuide, wishlist, delivery, stockIcons }: Props) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(initial);
  const [prompt, setPrompt] = useState(false);
  const [adding, startAdding] = useTransition();
  const [showSticky, setShowSticky] = useState(false);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const fieldsetRefs = useRef<Record<string, HTMLFieldSetElement | null>>({});

  const variant = findVariant(variants, options, selection);
  const summary = priceSummary(variants);
  const price = variant?.price ?? summary.price;
  const compareAt = variant ? (variant.compareAtPrice && variant.compareAtPrice > variant.price ? variant.compareAtPrice : null) : summary.compareAtPrice;
  const discount = percentOff(price, compareAt);
  const missing = options.find((option) => !selection[option.attributeId]);
  const soldOut = variant !== null && variant.stock === 0;
  const allSoldOut = variants.every((entry) => entry.stock === 0);

  useEffect(() => {
    const element = buttonsRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry!.isIntersecting && entry!.boundingClientRect.top < 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function choose(attributeId: string, valueId: string) {
    const next = { ...selection, [attributeId]: valueId };
    setSelection(next);
    setPrompt(false);
    const chosen = findVariant(variants, options, next);
    const url = new URL(window.location.href);
    if (chosen) url.searchParams.set("variant", chosen.id);
    else url.searchParams.delete("variant");
    window.history.replaceState(window.history.state, "", url);
  }

  function buy(then: "drawer" | "checkout") {
    if (!variant) {
      setPrompt(true);
      const fieldset = missing ? fieldsetRefs.current[missing.attributeId] : null;
      fieldset?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
      fieldset?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus({ preventScroll: true });
      return;
    }
    if (variant.stock === 0) return;
    startAdding(async () => {
      const result = await addToCart({ variantId: variant.id });
      cartStore.set({ cart: result.cart });
      if (result.ok && then === "checkout") {
        router.push("/checkout");
        return;
      }
      cartStore.open(result.ok ? labels.added : result.reason === "SOLD_OUT" ? labels.soldOutNow : result.reason === "LIMIT" ? labels.limit : labels.busy);
    });
  }

  const shownPrice = !variant && summary.from ? fill(labels.from, { price: formatPrice(price) }) : formatPrice(price);

  return (
    <div>
      <div className="mt-4">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className={`price text-2xl font-semibold ${discount ? "text-accent" : "text-ink"}`}>{shownPrice}</span>
          {compareAt && discount > 0 && (
            <>
              <s className="price text-base text-muted">
                <span className="sr-only">{fill(labels.originalPrice, { price: formatPrice(compareAt) })}</span>
                <span aria-hidden>{formatPrice(compareAt)}</span>
              </s>
              <span className="text-sm font-semibold text-accent">{fill(labels.percentOff, { percent: discount })}</span>
            </>
          )}
        </p>
        <p className="mt-1 text-sm text-muted">{labels.inclTaxes}</p>
        {price >= emiFrom && <p className="mt-1 text-sm text-muted">{labels.emi}</p>}
      </div>

      {options.map((option) => {
        const chosen = option.values.find((value) => value.id === selection[option.attributeId]);
        const highlight = prompt && missing?.attributeId === option.attributeId;
        return (
          <fieldset
            key={option.attributeId}
            ref={(node) => {
              fieldsetRefs.current[option.attributeId] = node;
            }}
            className="mt-6"
            aria-describedby={highlight ? "choose-prompt" : undefined}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <legend className={`text-sm ${highlight ? "font-semibold text-error" : "text-ink"}`}>
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
                            selected ? "border-accent bg-raised font-semibold text-ink ring-1 ring-accent ring-inset" : `${highlight ? "border-error" : "border-line-strong"} text-ink hover:border-ink`
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
                      <span aria-hidden className={`size-8 rounded-full border border-line-strong ${available ? "" : "opacity-40"}`} style={{ backgroundColor: value.hex ?? undefined }} />
                    ) : (
                      <span aria-hidden>{value.label.replace(/^UK /, "")}</span>
                    )}
                    {option.style === "SWATCH" && !available && <span aria-hidden className="absolute h-px w-9 rotate-45 bg-muted" />}
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
            <span id="choose-prompt" className={prompt ? "font-semibold text-error" : "text-muted"}>
              {fill(prompt ? labels.chooseFirst : labels.chooseOption, { name: shortName(missing) })}
            </span>
          )
        ) : variant.stock === 0 ? (
          <span className="font-medium text-ink">{labels.soldOut}</span>
        ) : variant.stock <= lowStockThreshold ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-ink">
            <span className="text-warning">{stockIcons.low}</span>
            {fill(labels.onlyLeft, { count: variant.stock })}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-success">
            {stockIcons.inStock}
            {labels.inStock}
          </span>
        )}
        {variant && <span className="ml-3 text-muted">{fill(labels.sku, { sku: variant.sku })}</span>}
      </div>

      {!allSoldOut && !soldOut && (
        <div ref={buttonsRef} className="mt-4 flex gap-2">
          <button type="button" onClick={() => buy("drawer")} disabled={adding} className={buttonClasses("primary", "md", "flex-1")}>
            {adding ? labels.adding : labels.addToBag}
          </button>
          <button type="button" onClick={() => buy("checkout")} disabled={adding} className={buttonClasses("secondary", "md", "flex-1")}>
            {labels.buyNow}
          </button>
          {wishlist}
        </div>
      )}
      {(allSoldOut || soldOut) && <div className="mt-4 flex justify-end">{wishlist}</div>}

      {variant && variant.stock === 0 && <NotifyMe variant={variant} labels={labels} />}

      {delivery && <div className="mt-6">{delivery}</div>}

      {/* Phones: price and "Add to bag" stay reachable once the main buttons scroll away. */}
      {!allSoldOut && (
        <div
          hidden={!showSticky}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised px-4 pt-3 shadow-overlay lg:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-screen-sm items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-muted">{title}</p>
              <p className="price text-base font-semibold">{shownPrice}</p>
            </div>
            <button type="button" onClick={() => buy("drawer")} disabled={adding || soldOut} className={buttonClasses("primary", "md", "shrink-0")}>
              {adding ? labels.adding : labels.addToBag}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifyMe({ variant, labels }: { variant: VariantDef; labels: BuyBoxLabels }) {
  const [state, action, pending] = useActionState<NotifyState, FormData>(requestBackInStock, { status: "idle" });
  if (state.status === "done") {
    return <p className="mt-4 rounded-sm border border-line bg-surface px-4 py-3 text-sm text-success">{labels.notifyDone}</p>;
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
          className="block min-h-11 w-full rounded-sm border border-line-strong bg-canvas px-3 text-base text-ink placeholder:text-muted"
        />
        <button type="submit" disabled={pending} className={buttonClasses("secondary", "md", "shrink-0")}>
          {labels.notifySubmit}
        </button>
      </div>
      {message && (
        <p role="alert" className="mt-2 text-sm text-error">
          {message}
        </p>
      )}
    </form>
  );
}
