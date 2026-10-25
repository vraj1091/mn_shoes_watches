/**
 * Product fields copied from variants and related records so category pages can filter and sort
 * on one table. Recomputed whenever a product or its variants are saved.
 */

export type VariantForListing = {
  price: number;
  compareAtPrice: number | null;
  stockOnHand: number;
  isActive: boolean;
};

export type ListingFields = {
  minPrice: number;
  maxPrice: number;
  maxDiscountBp: number;
  inStock: boolean;
};

export function listingFields(variants: VariantForListing[]): ListingFields {
  const active = variants.filter((variant) => variant.isActive);
  if (active.length === 0) return { minPrice: 0, maxPrice: 0, maxDiscountBp: 0, inStock: false };
  const prices = active.map((variant) => variant.price);
  const discounts = active.map(({ price, compareAtPrice }) =>
    compareAtPrice && compareAtPrice > price ? Math.floor(((compareAtPrice - price) * 10_000) / compareAtPrice) : 0,
  );
  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    maxDiscountBp: Math.max(...discounts),
    inStock: active.some((variant) => variant.stockOnHand > 0),
  };
}

/** Lower-case, de-duplicated words from everything a shopper might type to find the product. */
export function buildSearchText(parts: (string | null | undefined)[]): string {
  const words = parts
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);
  return [...new Set(words)].join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
