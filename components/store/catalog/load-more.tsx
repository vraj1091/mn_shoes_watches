"use client";

import { useState, useTransition } from "react";
import { loadMoreProducts } from "@/lib/actions/catalog";
import type { ScopeRef } from "@/lib/catalog/scope";
import type { ProductCardData } from "@/lib/catalog/types";
import { fill } from "@/lib/format/template";
import { ProductCard, type CardLabels } from "./product-card";

type Props = {
  scope: ScopeRef;
  params: Record<string, string[]>;
  page: number;
  pageCount: number;
  shown: number;
  total: number;
  gridClass: string;
  labels: { loadMore: string; loading: string; shown: string };
  cardLabels: CardLabels;
};

/**
 * "Show more products" appends the next page in place and updates ?page= in the address bar, so
 * reloading or sharing lands on the same products. The numbered links below stay for crawlers.
 */
export function LoadMore({ scope, params, page, pageCount, shown, total, gridClass, labels, cardLabels }: Props) {
  const [cards, setCards] = useState<ProductCardData[]>([]);
  const [current, setCurrent] = useState(page);
  const [pending, startTransition] = useTransition();
  const hasMore = current < pageCount;

  function more() {
    startTransition(async () => {
      const next = await loadMoreProducts({ scope, params, page: current + 1 });
      setCards((existing) => [...existing, ...next.cards]);
      setCurrent(next.page);
      const url = new URL(window.location.href);
      url.searchParams.set("page", String(next.page));
      window.history.replaceState(window.history.state, "", url);
    });
  }

  // Everything fits on one page: the count above the grid already says how many there are.
  if (pageCount <= 1) return null;

  return (
    <>
      {cards.length > 0 && (
        <ul className={`${gridClass} mt-8`}>
          {cards.map((card) => (
            <li key={card.id}>
              <ProductCard product={card} labels={cardLabels} />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-10 flex flex-col items-center gap-3">
        <p className="text-sm text-muted tabular-nums" role="status">
          {fill(labels.shown, { shown: shown + cards.length, total })}
        </p>
        {hasMore && (
          <button
            type="button"
            onClick={more}
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-sm border border-line-strong px-6 text-base font-medium text-ink hover:border-ink disabled:opacity-60"
          >
            {pending ? labels.loading : labels.loadMore}
          </button>
        )}
      </div>
    </>
  );
}
