import type { IndexedProduct, ProductCardData } from "./types";

const NEW_FOR_DAYS = 30;

/** Card data from an index entry. "Only N left" appears at or below the low-stock threshold (Part 3: real numbers only). */
export function toCardData(product: IndexedProduct, lowStockThreshold: number, now: number): ProductCardData {
  return {
    id: product.id,
    href: `/product/${product.slug}`,
    title: product.title,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    compareAtPrice: product.compareAtPrice,
    inStock: product.inStock,
    lowStockCount: product.inStock && product.stockTotal <= lowStockThreshold ? product.stockTotal : null,
    isNew: now - product.publishedAt < NEW_FOR_DAYS * 24 * 60 * 60 * 1000,
    swatches: product.swatches,
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
    image: product.image,
    hoverImage: product.hoverImage,
  };
}

/** Cards for a list of products, all judged "new" against the same moment. */
export function toCards(products: IndexedProduct[], lowStockThreshold: number, now = Date.now()): ProductCardData[] {
  return products.map((product) => toCardData(product, lowStockThreshold, now));
}
