import Link from "next/link";
import { formatPrice, percentOff } from "@/lib/format/money";
import { fill } from "@/lib/format/template";
import type { ProductCardData } from "@/lib/catalog/types";

export type CardLabels = {
  new: string;
  soldOut: string;
  onlyLeft: string;
  percentOff: string;
  from: string;
  moreSwatches: string;
  originalPrice: string;
};

const MAX_SWATCHES = 5;

/**
 * Product card for grids and rows. Has no server-only imports, so the "Show more" button can
 * render the same card in the browser. The title link stretches over the whole card.
 */
export function ProductCard({ product, labels, eager = false }: { product: ProductCardData; labels: CardLabels; eager?: boolean }) {
  const discount = percentOff(product.minPrice, product.compareAtPrice);
  const price = formatPrice(product.minPrice);
  const swatches = product.swatches.slice(0, MAX_SWATCHES);
  const extraSwatches = product.swatches.length - swatches.length;

  return (
    <article className="group relative flex flex-col">
      <div className="photo-tile relative aspect-[4/5] overflow-hidden rounded-md">
        {product.image ? (
          <>
            {/* Images get the responsive loader with uploads in Phase 4; the alt is empty because the title names the product. */}
            <img
              src={product.image.url}
              alt=""
              width={product.image.width}
              height={product.image.height}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="size-full object-cover transition-opacity duration-200"
            />
            {product.hoverImage && (
              <img
                src={product.hoverImage.url}
                alt=""
                width={product.hoverImage.width}
                height={product.hoverImage.height}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-lg:hidden"
              />
            )}
          </>
        ) : (
          // No photo yet: a plain tile with the name, never a stock image (Part 3).
          <span aria-hidden className="absolute inset-0 flex items-end p-4 text-lg leading-tight font-semibold">
            {product.title}
          </span>
        )}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {!product.inStock ? (
            <span className="rounded-sm bg-raised px-2 py-0.5 text-xs font-medium text-ink">{labels.soldOut}</span>
          ) : product.isNew ? (
            <span className="rounded-sm bg-badge px-2 py-0.5 text-xs font-medium text-badge-ink">{labels.new}</span>
          ) : null}
        </div>
      </div>

      <h3 className="mt-3 line-clamp-2 text-card font-medium text-ink">
        <Link
          href={product.href}
          className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-link"
        >
          {product.title}
        </Link>
      </h3>

      <p className="price mt-1 flex flex-wrap items-baseline gap-x-2 text-base">
        <span className={discount ? "font-medium text-sale" : "font-medium text-ink"}>
          {product.maxPrice > product.minPrice ? fill(labels.from, { price }) : price}
        </span>
        {product.compareAtPrice && discount > 0 && (
          <>
            <s className="text-sm text-muted">
              <span className="sr-only">{fill(labels.originalPrice, { price: formatPrice(product.compareAtPrice) })}</span>
              <span aria-hidden>{formatPrice(product.compareAtPrice)}</span>
            </s>
            <span className="text-sm text-sale">{fill(labels.percentOff, { percent: discount })}</span>
          </>
        )}
      </p>

      {swatches.length > 1 && (
        <ul className="mt-2 flex items-center gap-1.5" aria-label={swatches.map((swatch) => swatch.label).join(", ")}>
          {swatches.map((swatch) => (
            <li key={swatch.valueId} className="size-4 rounded-full border border-line-strong" style={{ backgroundColor: swatch.hex }} />
          ))}
          {extraSwatches > 0 && <li className="text-xs text-muted">{fill(labels.moreSwatches, { count: extraSwatches })}</li>}
        </ul>
      )}

      {product.lowStockCount !== null && (
        <p className="mt-1 text-sm text-sale">{fill(labels.onlyLeft, { count: product.lowStockCount })}</p>
      )}
    </article>
  );
}
