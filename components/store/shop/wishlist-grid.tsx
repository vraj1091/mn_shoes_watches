"use client";

import type { ProductCardData } from "@/lib/catalog/types";
import { ProductCard, type CardLabels } from "@/components/store/catalog/product-card";
import { useWishlist } from "./store";

/** Saved products; a card disappears as soon as its heart is tapped again. */
export function WishlistGrid({ cards, labels, empty, grid }: { cards: ProductCardData[]; labels: CardLabels; empty: string; grid: string }) {
  const { ids, loaded } = useWishlist();
  const shown = loaded ? cards.filter((card) => ids.has(card.id)) : cards;
  if (shown.length === 0) return <p className="mt-8 rounded-md bg-surface px-6 py-12 text-center text-base">{empty}</p>;
  return (
    <ul className={`${grid} mt-8`}>
      {shown.map((card) => (
        <li key={card.id}>
          <ProductCard product={card} labels={labels} />
        </li>
      ))}
    </ul>
  );
}
