import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog/types";
import { cardLabels } from "./listing-view";
import { ProductCard } from "./product-card";

/** A titled row of cards: "Complete the look", "You may also like", bestsellers. Scrolls sideways on phones. */
export function ProductRow({ id, title, products, link }: { id: string; title: string; products: ProductCardData[]; link?: { href: string; label: string } }) {
  if (products.length === 0) return null;
  const labels = cardLabels();
  return (
    <section aria-labelledby={id} className="mt-16">
      <div className="flex items-end justify-between gap-4">
        <h2 id={id} className="font-display text-2xl lg:text-3xl">
          {title}
        </h2>
        {link && (
          <Link href={link.href} className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-link hover:text-accent underline underline-offset-4 hover:no-underline">
            {link.label}
          </Link>
        )}
      </div>
      <ul className="-mx-4 mt-6 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id} className="w-[44vw] shrink-0 snap-start sm:w-auto">
            <ProductCard product={product} labels={labels} />
          </li>
        ))}
      </ul>
    </section>
  );
}
