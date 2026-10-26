"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { applyCoupon, updateCartItem } from "@/lib/actions/shop";
import type { CartView } from "@/lib/cart/cart";
import { formatPrice } from "@/lib/format/money";
import { fill } from "@/lib/format/template";
import { cartStore } from "./store";

export type BagLabels = {
  title: string;
  titleWithCount: string;
  empty: string;
  emptyHint: string;
  startShopping: string;
  remove: string;
  removeItem: string;
  quantity: string;
  decrease: string;
  increase: string;
  unavailable: string;
  priceChanged: string;
  subtotal: string;
  discount: string;
  delivery: string;
  free: string;
  codFee: string;
  total: string;
  inclGst: string;
  freeDeliveryLeft: string;
  freeDeliveryDone: string;
  viewBag: string;
  checkout: string;
  continueShopping: string;
  couponLabel: string;
  couponApply: string;
  couponRemove: string;
  couponApplied: string;
  couponInvalid: string;
  couponMinOrder: string;
  couponBusy: string;
  added: string;
  soldOut: string;
  limit: string;
  busy: string;
  close: string;
};

export function FreeDeliveryProgress({ cart, labels }: { cart: CartView; labels: BagLabels }) {
  const threshold = cart.freeShippingThreshold;
  const remaining = cart.totals.freeShippingRemaining;
  if (threshold === null || remaining === null || cart.count === 0) return null;
  const done = remaining === 0;
  const percent = Math.min(100, Math.round(((threshold - remaining) / threshold) * 100));
  return (
    <div>
      <p className="text-sm" aria-live="polite">
        {done ? <span className="font-medium text-stock">{labels.freeDeliveryDone}</span> : fill(labels.freeDeliveryLeft, { amount: formatPrice(remaining) })}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="presentation">
        <div className={`h-full rounded-full ${done ? "bg-stock" : "bg-primary"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function CartLines({ cart, labels, compact = false }: { cart: CartView; labels: BagLabels; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function change(variantId: string, quantity: number) {
    setBusyId(variantId);
    startTransition(async () => {
      const result = await updateCartItem({ variantId, quantity });
      cartStore.set({ cart: result.cart });
      setBusyId(null);
    });
  }

  return (
    <ul className="divide-y divide-line">
      {cart.lines.map((line) => {
        const busy = pending && busyId === line.variantId;
        return (
          <li key={line.variantId} className={`flex gap-4 py-4 ${busy ? "opacity-60" : ""}`}>
            <Link href={`/product/${line.slug}`} className={`photo-tile relative shrink-0 overflow-hidden rounded-md ${compact ? "size-20" : "size-24 sm:size-28"}`}>
              {line.image && (
                <Image
                  src={line.image.url}
                  alt={line.image.alt}
                  fill
                  sizes="112px"
                  className={line.image.url.endsWith(".svg") ? "object-cover mix-blend-normal" : "object-contain p-1.5"}
                />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              {line.brand && <p className="text-xs font-semibold tracking-wide text-muted uppercase">{line.brand}</p>}
              <Link href={`/product/${line.slug}`} className="line-clamp-2 text-card font-medium hover:text-link">
                {line.title}
              </Link>
              {line.variantTitle && <p className="text-sm text-muted">{line.variantTitle}</p>}
              <p className="price mt-1 text-sm">
                <span className={line.compareAtPrice ? "font-semibold text-sale" : "font-semibold"}>{formatPrice(line.unitPrice)}</span>
                {line.compareAtPrice && <s className="ml-2 text-muted">{formatPrice(line.compareAtPrice)}</s>}
              </p>
              {!line.available && <p className="mt-1 text-sm font-medium text-sale">{labels.unavailable}</p>}
              {line.available && line.priceChanged && <p className="mt-1 text-sm text-muted">{labels.priceChanged}</p>}
              <div className="mt-2 flex items-center gap-3">
                {line.available && (
                  <div className="inline-flex items-center rounded-sm border border-line-strong" role="group" aria-label={`${labels.quantity}: ${line.title}`}>
                    <button
                      type="button"
                      aria-label={labels.decrease}
                      disabled={busy || line.quantity <= 1}
                      onClick={() => change(line.variantId, line.quantity - 1)}
                      className="flex size-11 items-center justify-center text-lg disabled:text-muted"
                    >
                      −
                    </button>
                    <span className="price w-8 text-center text-sm" aria-live="polite">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={labels.increase}
                      disabled={busy || line.quantity >= line.maxQuantity}
                      onClick={() => change(line.variantId, line.quantity + 1)}
                      className="flex size-11 items-center justify-center text-lg disabled:text-muted"
                    >
                      +
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => change(line.variantId, 0)}
                  aria-label={fill(labels.removeItem, { title: line.title })}
                  className="min-h-11 text-sm text-muted underline underline-offset-4 hover:text-ink"
                >
                  {labels.remove}
                </button>
              </div>
            </div>
            <p className="price shrink-0 text-sm font-semibold">{formatPrice(line.lineTotal)}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function TotalsTable({ cart, labels }: { cart: CartView; labels: BagLabels }) {
  const { totals } = cart;
  const row = "flex justify-between gap-4 py-1.5";
  return (
    <dl className="price text-sm">
      <div className={row}>
        <dt>{labels.subtotal}</dt>
        <dd>{formatPrice(totals.subtotal)}</dd>
      </div>
      {totals.discountTotal > 0 && (
        <div className={`${row} text-stock`}>
          <dt>
            {labels.discount}
            {cart.coupon ? ` (${cart.coupon.code})` : ""}
          </dt>
          <dd>−{formatPrice(totals.discountTotal)}</dd>
        </div>
      )}
      <div className={row}>
        <dt>{labels.delivery}</dt>
        <dd>{totals.shippingTotal === 0 ? labels.free : formatPrice(totals.shippingTotal)}</dd>
      </div>
      {totals.codFee > 0 && (
        <div className={row}>
          <dt>{labels.codFee}</dt>
          <dd>{formatPrice(totals.codFee)}</dd>
        </div>
      )}
      <div className={`${row} mt-1 border-t border-line pt-3 text-base font-semibold`}>
        <dt>{labels.total}</dt>
        <dd>{formatPrice(totals.grandTotal)}</dd>
      </div>
      <p className="text-xs text-muted">{fill(labels.inclGst, { amount: formatPrice(totals.taxTotal) })}</p>
    </dl>
  );
}

export function CouponField({ cart, labels, onChange }: { cart: CartView; labels: BagLabels; onChange?: (cart: CartView) => void }) {
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const coupon = cart.coupon;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    if (!code) return;
    startTransition(async () => {
      const result = await applyCoupon(code);
      cartStore.set({ cart: result.cart });
      onChange?.(result.cart);
      if (result.status === "APPLIED") {
        const problem = result.cart.coupon?.problem;
        setMessage(
          problem === "MIN_ORDER"
            ? { tone: "error", text: fill(labels.couponMinOrder, { code: result.cart.coupon!.code, label: result.cart.coupon!.label ?? "" }) }
            : { tone: "ok", text: fill(labels.couponApplied, { code: result.cart.coupon!.code }) },
        );
      } else setMessage({ tone: "error", text: result.status === "BUSY" ? labels.couponBusy : labels.couponInvalid });
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await applyCoupon(null);
      cartStore.set({ cart: result.cart });
      onChange?.(result.cart);
      setMessage(null);
    });
  }

  if (coupon && coupon.problem !== "INVALID") {
    return (
      <div className="text-sm">
        <div className="flex items-center justify-between gap-3 rounded-sm border border-line px-3 py-2">
          <span>
            <span className="font-semibold">{coupon.code}</span>
            {coupon.label && <span className="block text-muted">{coupon.label}</span>}
          </span>
          <button type="button" onClick={remove} disabled={pending} className="min-h-11 shrink-0 text-link underline underline-offset-4">
            {labels.couponRemove}
          </button>
        </div>
        {coupon.problem === "MIN_ORDER" ? (
          <p className="mt-2 text-sale" role="alert">
            {fill(labels.couponMinOrder, { code: coupon.code, label: coupon.label ?? "" })}
          </p>
        ) : (
          message?.tone === "ok" && (
            <p className="mt-2 text-stock" role="status">
              {message.text}
            </p>
          )
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-sm">
      <label htmlFor="coupon-code" className="mb-1.5 block font-medium">
        {labels.couponLabel}
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={32}
          className="block min-h-11 w-full rounded-sm border border-line-strong bg-canvas px-3 text-base uppercase placeholder:normal-case"
          aria-describedby={message ? "coupon-message" : undefined}
        />
        <button type="submit" disabled={pending} className="min-h-11 shrink-0 rounded-sm border border-line px-4 font-medium hover:border-line-strong hover:bg-surface">
          {labels.couponApply}
        </button>
      </div>
      {message && (
        <p id="coupon-message" role={message.tone === "error" ? "alert" : "status"} className={`mt-2 ${message.tone === "error" ? "text-sale" : "text-stock"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
