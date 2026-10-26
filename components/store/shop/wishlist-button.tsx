"use client";

import { fill } from "@/lib/format/template";
import { useWishlist, wishlistStore } from "./store";

export type WishlistLabels = { add: string; remove: string };

/** Heart toggle. Works without an account: the list is kept against this browser (DECISIONS.md 17). */
export function WishlistButton({ productId, title, labels, size = "card" }: { productId: string; title: string; labels: WishlistLabels; size?: "card" | "page" }) {
  const { ids } = useWishlist();
  const saved = ids.has(productId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={fill(saved ? labels.remove : labels.add, { title })}
      onClick={() => void wishlistStore.toggle(productId)}
      className={`flex items-center justify-center rounded-full transition-colors ${
        size === "card" ? "size-11 text-tile-ink hover:text-sale" : "size-11 border border-line text-ink hover:border-line-strong hover:text-sale"
      } aria-pressed:text-sale`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 20.5s-7.5-4.4-9.3-9.2C1.6 8.2 3.4 4.5 7 4.5c2.1 0 3.7 1.2 5 3 1.3-1.8 2.9-3 5-3 3.6 0 5.4 3.7 4.3 6.8-1.8 4.8-9.3 9.2-9.3 9.2z" />
      </svg>
    </button>
  );
}
