"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fill } from "@/lib/format/template";
import { buttonClasses } from "@/components/ui/button";
import { CartLines, FreeDeliveryProgress, TotalsTable, type BagLabels } from "./cart-parts";
import { cartStore, useCartState } from "./store";

/** Header bag icon with the item count. Opens the drawer; without JavaScript it is a link to /cart. */
export function BagButton({ initialCount, label, labelEmpty, icon }: { initialCount: number; label: string; labelEmpty: string; icon: ReactNode }) {
  const { cart } = useCartState();
  const count = cart ? cart.count : initialCount;
  return (
    <Link
      href="/cart"
      prefetch={false}
      onClick={(event) => {
        event.preventDefault();
        cartStore.open();
      }}
      aria-label={count ? fill(label, { count }) : labelEmpty}
      className="relative -mr-2 flex size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-surface hover:text-accent xl:mr-0"
    >
      {icon}
      {count > 0 && (
        <span aria-hidden className="price absolute top-1 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] leading-5 font-semibold text-on-primary">
          {count}
        </span>
      )}
    </Link>
  );
}

/** The bag as a drawer from the right: opens after "Add to bag" and from the header. */
export function CartDrawer({ labels, closeIcon }: { labels: BagLabels; closeIcon: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { cart, drawerOpen, notice } = useCartState();
  const pathname = usePathname();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (drawerOpen && !element.open) {
      element.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!drawerOpen && element.open) element.close();
  }, [drawerOpen]);

  // Leaving the page (for example "Checkout") closes the drawer.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (drawerOpen) cartStore.set({ drawerOpen: false });
  }

  const close = () => cartStore.set({ drawerOpen: false });

  return (
    <dialog
      ref={dialog}
      aria-labelledby="bag-title"
      onClose={() => {
        document.documentElement.style.overflow = "";
        cartStore.set({ drawerOpen: false, notice: null });
      }}
      onClick={(event) => event.target === event.currentTarget && close()}
      className="chrome-exit drawer-right m-0 ml-auto h-dvh max-h-none w-[min(92vw,26rem)] max-w-none bg-raised p-0 text-ink shadow-overlay"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pr-2 pl-5">
          <h2 id="bag-title" className="text-lg font-semibold">
            {cart && cart.count > 0 ? fill(labels.titleWithCount, { count: cart.count }) : labels.title}
          </h2>
          <button type="button" aria-label={labels.close} onClick={close} className="flex size-11 items-center justify-center rounded-sm hover:bg-surface">
            {closeIcon}
          </button>
        </div>
        {notice && (
          <p role="status" className="shrink-0 border-b border-line bg-surface px-5 py-3 text-sm font-medium">
            {notice}
          </p>
        )}
        {!cart ? (
          <div className="flex-1 p-5 text-sm text-muted" aria-busy="true" />
        ) : cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-start gap-3 p-5">
            <p className="text-base font-medium">{labels.empty}</p>
            <p className="text-sm text-muted">{labels.emptyHint}</p>
            <button type="button" onClick={close} className={buttonClasses("secondary", "md", "mt-2")}>
              {labels.continueShopping}
            </button>
          </div>
        ) : (
          <>
            <div className="shrink-0 px-5 pt-4">
              <FreeDeliveryProgress cart={cart} labels={labels} />
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5">
              <CartLines cart={cart} labels={labels} compact />
            </div>
            <div className="shrink-0 space-y-3 border-t border-line bg-raised p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
              <TotalsTable cart={cart} labels={labels} />
              <div className="grid grid-cols-2 gap-2">
                <Link href="/cart" prefetch={false} onClick={close} className={buttonClasses("secondary", "md")}>
                  {labels.viewBag}
                </Link>
                <Link href="/checkout" prefetch={false} onClick={close} className={buttonClasses("primary", "md")}>
                  {labels.checkout}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
