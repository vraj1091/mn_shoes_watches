import { ancestors, descendantIds, productsInCategories } from "./query";
import type { CatalogIndex, IndexedProduct } from "./types";

/** The owner's "complete the look" picks, in their order, skipping any that are not on sale now. */
export function pickProducts(index: CatalogIndex, ids: string[]): IndexedProduct[] {
  const byId = new Map(index.products.map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter((product): product is IndexedProduct => product !== undefined);
}

/**
 * "You may also like": other products from the same category, widening one level at a time up to
 * the department (so a shoe never suggests a perfume). In-stock first, then closest in price,
 * then bestsellers.
 */
export function similarProducts(
  index: CatalogIndex,
  product: { id: string; primaryCategoryId: string | null; price: number },
  exclude: Set<string>,
  limit = 4,
): IndexedProduct[] {
  if (!product.primaryCategoryId) return [];
  const picked: IndexedProduct[] = [];
  const seen = new Set([product.id, ...exclude]);
  const distance = (candidate: IndexedProduct) => Math.abs(candidate.minPrice - product.price) / Math.max(product.price, 1);

  for (const level of ancestors(index.categories, product.primaryCategoryId).reverse()) {
    const candidates = productsInCategories(index.products, descendantIds(index.categories, level.id))
      .filter((candidate) => !seen.has(candidate.id))
      .sort(
        (a, b) =>
          Number(b.inStock) - Number(a.inStock) || distance(a) - distance(b) || b.bestsellerScore - a.bestsellerScore || a.title.localeCompare(b.title),
      );
    for (const candidate of candidates) {
      if (picked.length >= limit) return picked;
      picked.push(candidate);
      seen.add(candidate.id);
    }
  }
  return picked;
}
