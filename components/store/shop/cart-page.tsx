"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { CartView } from "@/lib/cart/cart";
import { buttonClasses } from "@/components/ui/button";
import { CartLines, CouponField, FreeDeliveryProgress, TotalsTable, type BagLabels } from "./cart-parts";
import { cartStore, useCartState } from "./store";

/** The full bag page: lines on the left; delivery progress, coupon and totals on the right. */
export function CartPageView({ initial, labels }: { initial: CartView; labels: BagLabels }) {
  const { cart } = useCartState();
  const view = cart ?? initial;

  useEffect(() => {
    if (!cartStore.get().cart) cartStore.set({ cart: initial });
  }, [initial]);

  if (view.lines.length === 0) {
    return (
      <div className="mt-8 rounded-md bg-surface px-6 py-12 text-center">
        <p className="text-lg font-medium">{labels.empty}</p>
        <p className="mt-1 text-muted">{labels.emptyHint}</p>
        <Link href="/" className={buttonClasses("primary", "md", "mt-6")}>
          {labels.startShopping}
        </Link>
      </div>
    );
  }

  const blocked = view.lines.some((line) => !line.available);
  return (
    <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
      <div>
        <CartLines cart={view} labels={labels} />
      </div>
      <aside className="mt-8 space-y-5 self-start rounded-md bg-surface p-5 lg:sticky lg:top-24 lg:mt-0">
        <FreeDeliveryProgress cart={view} labels={labels} />
        <CouponField cart={view} labels={labels} />
        <TotalsTable cart={view} labels={labels} />
        <Link
          href="/checkout"
          prefetch={false}
          aria-disabled={blocked || undefined}
          className={buttonClasses("primary", "md", "w-full")}
        >
          {labels.checkout}
        </Link>
        <Link href="/" className="block text-center text-sm text-link underline underline-offset-4">
          {labels.continueShopping}
        </Link>
      </aside>
    </div>
  );
}
