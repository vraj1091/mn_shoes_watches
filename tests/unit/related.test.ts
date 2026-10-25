import { describe, expect, it } from "vitest";
import { toCards } from "@/lib/catalog/cards";
import { pickProducts, similarProducts } from "@/lib/catalog/related";
import type { CatalogIndex, CategoryNode, IndexedProduct } from "@/lib/catalog/types";

const node = (id: string, parentId: string | null, depth: number): CategoryNode => ({
  id,
  name: id,
  slug: id,
  path: id,
  parentId,
  depth,
  position: 0,
  filterAttributeIds: [],
});

const product = (id: string, categoryId: string, overrides: Partial<IndexedProduct> = {}): IndexedProduct => ({
  id,
  slug: id,
  title: id,
  primaryCategoryId: categoryId,
  categoryPositions: { [categoryId]: 0 },
  gender: "MEN",
  minPrice: 3_000_00,
  maxPrice: 3_000_00,
  compareAtPrice: null,
  maxDiscountBp: 0,
  inStock: true,
  stockTotal: 10,
  bestsellerScore: 0,
  publishedAt: 0,
  ratingAvg: 0,
  ratingCount: 0,
  attributeValueIds: [],
  numberValues: {},
  availableAxisValueIds: [],
  swatches: [],
  tagSlugs: [],
  image: null,
  hoverImage: null,
  ...overrides,
});

// shoes > formal > oxfords, shoes > casual; perfumes is a separate department.
const categories = [
  node("shoes", null, 0),
  node("formal", "shoes", 1),
  node("oxfords", "formal", 2),
  node("casual", "shoes", 1),
  node("perfumes", null, 0),
];

const index = (products: IndexedProduct[]): CatalogIndex => ({ products, attributes: [], categories, lowStockThreshold: 5 });

describe("similarProducts", () => {
  const current = { id: "oxford-a", primaryCategoryId: "oxfords", price: 3_000_00 };

  it("prefers the same category, then widens up to the department but never beyond", () => {
    const products = [
      product("oxford-a", "oxfords"),
      product("oxford-b", "oxfords"),
      product("derby", "formal"),
      product("sneaker", "casual"),
      product("attar", "perfumes"),
    ];
    expect(similarProducts(index(products), current, new Set(), 10).map((entry) => entry.id)).toEqual(["oxford-b", "derby", "sneaker"]);
  });

  it("puts in-stock products first, then the closest price, then bestsellers", () => {
    const products = [
      product("oxford-a", "oxfords"),
      product("sold-out", "oxfords", { inStock: false, minPrice: 3_000_00 }),
      product("far", "oxfords", { minPrice: 9_000_00 }),
      product("near", "oxfords", { minPrice: 3_200_00 }),
      product("near-popular", "oxfords", { minPrice: 2_800_00, bestsellerScore: 50 }),
    ];
    expect(similarProducts(index(products), current, new Set(), 4).map((entry) => entry.id)).toEqual(["near-popular", "near", "far", "sold-out"]);
  });

  it("skips excluded products such as the complete-the-look picks, and respects the limit", () => {
    const products = [product("oxford-a", "oxfords"), product("oxford-b", "oxfords"), product("oxford-c", "oxfords"), product("derby", "formal")];
    expect(similarProducts(index(products), current, new Set(["oxford-b"]), 2).map((entry) => entry.id)).toEqual(["oxford-c", "derby"]);
  });

  it("returns nothing for a product without a category", () => {
    expect(similarProducts(index([product("x", "oxfords")]), { id: "y", primaryCategoryId: null, price: 0 }, new Set())).toEqual([]);
  });
});

describe("pickProducts", () => {
  it("keeps the owner's order and drops products that are no longer on sale", () => {
    const products = [product("belt", "casual"), product("sneaker", "casual")];
    expect(pickProducts(index(products), ["sneaker", "archived", "belt"]).map((entry) => entry.id)).toEqual(["sneaker", "belt"]);
  });
});

describe("toCards", () => {
  it("judges every card against the same moment", () => {
    const day = 24 * 60 * 60 * 1000;
    const now = 100 * day;
    const cards = toCards([product("fresh", "casual", { publishedAt: now - 2 * day }), product("old", "casual", { publishedAt: now - 40 * day })], 5, now);
    expect(cards.map((card) => [card.href, card.isNew])).toEqual([
      ["/product/fresh", true],
      ["/product/old", false],
    ]);
  });
});
