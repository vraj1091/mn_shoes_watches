"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ProductCardData } from "@/lib/catalog/types";
import { ProductCard, type CardLabels } from "@/components/store/catalog/product-card";
import { SectionHeading } from "@/components/store/section-heading";

const KEY = "mn-recently-viewed";
const MAX = 12;
const EVENT = "mn-recently-viewed";

// Kept on this device only: no account needed and no database write per view (DECISIONS.md 19).
let cache: { raw: string | null; value: ProductCardData[] } = { raw: null, value: [] };

function read(): ProductCardData[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache.value;
  }
  if (raw === cache.raw) return cache.value;
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    cache = { raw, value: Array.isArray(parsed) ? (parsed as ProductCardData[]).filter((item) => item && typeof item.href === "string") : [] };
  } catch {
    cache = { raw, value: [] };
  }
  return cache.value;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

const EMPTY: ProductCardData[] = [];

export function RecentlyViewed({ current, title, labels }: { current: ProductCardData; title: string; labels: CardLabels }) {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  useEffect(() => {
    try {
      const next = [current, ...read().filter((item) => item.id !== current.id)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT));
    } catch {
      // Storage blocked: the row simply stays empty.
    }
  }, [current]);

  const others = items.filter((item) => item.id !== current.id).slice(0, 4);
  if (others.length === 0) return null;
  return (
    <section aria-labelledby="recently-viewed" className="mt-16">
      <SectionHeading id="recently-viewed" title={title} />
      <ul className="-mx-4 mt-6 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {others.map((product) => (
          <li key={product.id} className="w-[44vw] shrink-0 snap-start sm:w-auto">
            <ProductCard product={product} labels={labels} />
          </li>
        ))}
      </ul>
    </section>
  );
}
