import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
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
  rating: string;
};

const MAX_SWATCHES = 5;

/** Generated placeholder images carry their own tile background and fill the tile edge to edge. */
export const isPlaceholderImage = (url: string) => url.endsWith(".svg");

/** Card photos are about a quarter of the content width on desktop and half on phones. */
export const CARD_SIZES = "(min-width: 1280px) 260px, (min-width: 768px) 30vw, 46vw";

/**
 * Product card for grids and rows. Has no server-only imports, so "Show more" and "Recently
 * viewed" can render the same card in the browser. The title link stretches over the whole card;
 * the wishlist button sits above it.
 */
export function ProductCard({
  product,
  labels,
  eager = false,
  wishlist,
}: {
  product: ProductCardData;
  labels: CardLabels;
  eager?: boolean;
  wishlist?: ReactNode;
}) {
  const discount = percentOff(product.minPrice, product.compareAtPrice);
  const price = formatPrice(product.minPrice);
  const swatches = product.swatches.slice(0, MAX_SWATCHES);
  const extraSwatches = product.swatches.length - swatches.length;
  const badge = !product.inStock ? labels.soldOut : (product.badge ?? (product.isNew ? labels.new : null));

  return (
    <article className="group relative flex flex-col">
      <div className="photo-tile relative aspect-square overflow-hidden rounded-md">
        {product.image ? (
          <>
            <Image
              src={product.image.url}
              alt={product.image.alt || product.title}
              fill
              sizes={CARD_SIZES}
              loading={eager ? "eager" : "lazy"}
              placeholder={product.image.blurDataUrl ? "blur" : "empty"}
              blurDataURL={product.image.blurDataUrl ?? undefined}
              className={`transition-opacity duration-300 ${isPlaceholderImage(product.image.url) ? "object-cover mix-blend-normal" : "object-contain p-[4%]"} ${product.hoverImage ? "lg:group-hover:opacity-0" : ""}`}
            />
            {product.hoverImage && (
              // Second photo on hover (desktop only); decorative, the first photo already has the alt text.
              <Image
                src={product.hoverImage.url}
                alt=""
                fill
                sizes={CARD_SIZES}
                className="object-contain p-[4%] opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-lg:hidden"
              />
            )}
          </>
        ) : (
          <span aria-hidden className="absolute inset-0 flex items-end p-4 text-lg leading-tight font-semibold">
            {product.title}
          </span>
        )}
        {badge && (
          <span
            className={`absolute top-2 left-2 rounded-sm px-2 py-0.5 text-xs font-semibold ${
              product.inStock ? "bg-badge text-badge-ink" : "bg-raised text-ink"
            }`}
          >
            {badge}
          </span>
        )}
        {wishlist && <div className="absolute top-1 right-1 z-10">{wishlist}</div>}
      </div>

      {product.brand && <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">{product.brand}</p>}
      <h3 className={`${product.brand ? "mt-0.5" : "mt-3"} line-clamp-2 text-card font-medium text-ink`}>
        <Link
          href={product.href}
          className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-link"
        >
          {product.title}
        </Link>
      </h3>

      <p className="price mt-1 flex flex-wrap items-baseline gap-x-2 text-base">
        <span className={discount ? "font-semibold text-sale" : "font-semibold text-ink"}>
          {product.maxPrice > product.minPrice ? fill(labels.from, { price }) : price}
        </span>
        {product.compareAtPrice && discount > 0 && (
          <>
            <s className="text-sm text-muted">
              <span className="sr-only">{fill(labels.originalPrice, { price: formatPrice(product.compareAtPrice) })}</span>
              <span aria-hidden>{formatPrice(product.compareAtPrice)}</span>
            </s>
            <span className="text-xs font-semibold text-sale">{fill(labels.percentOff, { percent: discount })}</span>
          </>
        )}
      </p>

      {product.ratingCount > 0 && (
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <svg aria-hidden viewBox="0 0 20 20" className="size-3.5 fill-star">
            <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8l-5.2 2.7 1-5.8L1.6 7.6l5.8-.8z" />
          </svg>
          <span aria-hidden className="price">
            {product.ratingAvg.toFixed(1)} ({product.ratingCount})
          </span>
          <span className="sr-only">{fill(labels.rating, { rating: product.ratingAvg.toFixed(1), count: product.ratingCount })}</span>
        </p>
      )}

      {swatches.length > 1 && (
        <ul className="mt-2 flex items-center gap-1.5" aria-label={swatches.map((swatch) => swatch.label).join(", ")}>
          {swatches.map((swatch) => (
            <li key={swatch.valueId} className="size-4 rounded-full border border-line-strong" style={{ backgroundColor: swatch.hex }} />
          ))}
          {extraSwatches > 0 && <li className="text-xs text-muted">{fill(labels.moreSwatches, { count: extraSwatches })}</li>}
        </ul>
      )}

      {product.lowStockCount !== null && (
        <p className="mt-1 text-sm font-medium text-sale">{fill(labels.onlyLeft, { count: product.lowStockCount })}</p>
      )}
    </article>
  );
}
