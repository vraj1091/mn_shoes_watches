import { describe, expect, it } from "vitest";
import {
  ancestors,
  categoryFacets,
  departmentFacet,
  descendantIds,
  listingHref,
  parseListingState,
  parsePrice,
  productsInCategories,
  runListing,
  sortProducts,
  toggleSelection,
  type FacetDef,
} from "@/lib/catalog/query";
import type { AttributeMeta, CategoryNode, IndexedProduct } from "@/lib/catalog/types";

const colour: AttributeMeta = {
  id: "a-colour",
  code: "colour",
  name: "Colour",
  type: "SELECT",
  unit: null,
  isVariantAxis: true,
  isFilterable: true,
  filterStyle: "SWATCH",
  position: 0,
  values: [
    { id: "v-black", value: "Black", slug: "black", swatchHex: "#000000", sortKey: null, position: 0 },
    { id: "v-tan", value: "Tan", slug: "tan", swatchHex: "#a8693a", sortKey: null, position: 1 },
  ],
};
const size: AttributeMeta = {
  id: "a-size",
  code: "size_uk",
  name: "Size",
  type: "SELECT",
  unit: null,
  isVariantAxis: true,
  isFilterable: true,
  filterStyle: "CHECKBOX",
  position: 1,
  values: [
    { id: "v-8", value: "UK 8", slug: "uk-8", swatchHex: null, sortKey: 8, position: 0 },
    { id: "v-9", value: "UK 9", slug: "uk-9", swatchHex: null, sortKey: 9, position: 1 },
  ],
};
const material: AttributeMeta = {
  id: "a-material",
  code: "upper_material",
  name: "Upper material",
  type: "SELECT",
  unit: null,
  isVariantAxis: false,
  isFilterable: true,
  filterStyle: "CHECKBOX",
  position: 2,
  values: [
    { id: "v-leather", value: "Leather", slug: "leather", swatchHex: null, sortKey: null, position: 0 },
    { id: "v-suede", value: "Suede", slug: "suede", swatchHex: null, sortKey: null, position: 1 },
  ],
};
const dial: AttributeMeta = { ...material, id: "a-dial", code: "dial_size_mm", name: "Dial size", type: "NUMBER", unit: "mm", values: [] };

const product = (overrides: Partial<IndexedProduct> & { id: string }): IndexedProduct => ({
  slug: overrides.id,
  title: overrides.id,
  primaryCategoryId: "c-formal",
  categoryPositions: { "c-formal": 0 },
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

const products = [
  // Black leather, in stock in UK 8 only.
  product({ id: "oxford", attributeValueIds: ["v-leather"], availableAxisValueIds: ["v-black", "v-8"], minPrice: 4_499_00, bestsellerScore: 5 }),
  // Tan suede, in stock in UK 8 and 9.
  product({ id: "chelsea", attributeValueIds: ["v-suede"], availableAxisValueIds: ["v-tan", "v-8", "v-9"], minPrice: 5_999_00, bestsellerScore: 9 }),
  // Tan leather, sold out everywhere.
  product({ id: "derby", attributeValueIds: ["v-leather"], availableAxisValueIds: [], inStock: false, minPrice: 1_299_00, bestsellerScore: 20 }),
];

const facets: FacetDef[] = [colour, size, material].map((attribute) => ({ kind: "attribute", key: attribute.code, label: attribute.name, attribute }));
const parse = (params: Record<string, string | string[]>) => parseListingState(params, facets, "relevance");

describe("parsing the URL", () => {
  it("reads repeated and comma-separated values, ignoring unknown filters", () => {
    const state = parse({ colour: ["black", "tan"], size_uk: "uk-8,uk-9", brand: "x", sort: "price-asc", page: "2", in_stock: "1" });
    expect(state.selections).toEqual({ colour: ["black", "tan"], size_uk: ["uk-8", "uk-9"] });
    expect(state).toMatchObject({ sort: "price-asc", page: 2, inStock: true, price: null });
  });

  it("falls back to defaults for nonsense", () => {
    expect(parse({ sort: "cheapest", page: "-3" })).toMatchObject({ sort: "relevance", page: 1 });
    expect(parse({ page: "2.5" }).page).toBe(1);
  });

  it("reads price ranges in rupees and rejects bad ones", () => {
    expect(parsePrice("1000-2500")).toEqual({ min: 1_000_00, max: 2_500_00 });
    expect(parsePrice("25000-")).toEqual({ min: 25_000_00, max: null });
    expect(parsePrice("5000-1000")).toBeNull();
    expect(parsePrice("abc")).toBeNull();
  });
});

describe("filtering", () => {
  it("matches sizes only where that size is actually in stock", () => {
    const result = runListing(products, parse({ size_uk: "uk-9" }), facets);
    expect(result.items.map((p) => p.id)).toEqual(["chelsea"]);
  });

  it("ORs values within a filter and ANDs across filters", () => {
    expect(runListing(products, parse({ colour: ["black", "tan"] }), facets).total).toBe(2);
    expect(runListing(products, parse({ colour: "tan", upper_material: "leather" }), facets).total).toBe(0);
    expect(runListing(products, parse({ upper_material: ["leather", "suede"], size_uk: "uk-8" }), facets).total).toBe(2);
  });

  it("filters by price on the lowest variant price", () => {
    const result = runListing(products, parse({ price: "1000-5000" }), facets);
    expect(result.items.map((p) => p.id).sort()).toEqual(["derby", "oxford"]);
  });

  it("can hide sold-out products", () => {
    expect(runListing(products, parse({ in_stock: "1" }), facets).total).toBe(2);
  });

  it("counts each facet against the other filters only", () => {
    const result = runListing(products, parse({ colour: "tan" }), facets);
    const colourFacet = result.facets.find((facet) => facet.key === "colour")!;
    // Choosing Tan must not make Black look empty: Black still shows what a click would give.
    expect(colourFacet.values.map((value) => [value.slug, value.count, value.selected])).toEqual([
      ["black", 1, false],
      ["tan", 1, true],
    ]);
    const materialFacet = result.facets.find((facet) => facet.key === "upper_material")!;
    expect(materialFacet.values.map((value) => [value.slug, value.count])).toEqual([["suede", 1]]);
  });

  it("counts number attributes by their distinct values", () => {
    const watches = [
      product({ id: "w1", numberValues: { "a-dial": 42 } }),
      product({ id: "w2", numberValues: { "a-dial": 40 } }),
      product({ id: "w3", numberValues: { "a-dial": 42 } }),
    ];
    const dialFacets: FacetDef[] = [{ kind: "attribute", key: "dial_size_mm", label: "Dial size", attribute: dial }];
    const result = runListing(watches, parseListingState({ dial_size_mm: "42" }, dialFacets, "relevance"), dialFacets);
    expect(result.total).toBe(2);
    expect(result.facets[0]!.values.map((value) => [value.label, value.count])).toEqual([
      ["40 mm", 1],
      ["42 mm", 2],
    ]);
  });
});

describe("sorting and paging", () => {
  it("puts sold-out products last whatever the sort", () => {
    expect(sortProducts(products, "price-asc").map((p) => p.id)).toEqual(["oxford", "chelsea", "derby"]);
    expect(sortProducts(products, "bestselling").map((p) => p.id)).toEqual(["chelsea", "oxford", "derby"]);
  });

  it("uses the given relevance order", () => {
    const order = { derby: 0, oxford: 1, chelsea: 2 } as Record<string, number>;
    expect(sortProducts(products, "relevance", (p) => order[p.id]!).map((p) => p.id)).toEqual(["oxford", "chelsea", "derby"]);
  });

  it("pages results and clamps an out-of-range page", () => {
    const many = Array.from({ length: 30 }, (_, i) => product({ id: `p${i}` }));
    const page2 = runListing(many, parse({ page: "2" }), facets);
    expect(page2).toMatchObject({ total: 30, page: 2, pageCount: 2 });
    expect(page2.items).toHaveLength(6);
    expect(runListing(many, parse({ page: "9" }), facets).page).toBe(2);
  });
});

describe("URLs", () => {
  it("leaves defaults out so the clean URL stays canonical", () => {
    expect(listingHref("/mens-shoes", parse({}), "relevance")).toBe("/mens-shoes");
    expect(listingHref("/mens-shoes", parse({ colour: "tan", sort: "newest" }), "relevance", { page: 2 })).toBe(
      "/mens-shoes?colour=tan&sort=newest&page=2",
    );
  });

  it("keeps a query already in the base, as search does", () => {
    expect(listingHref("/search?q=oxford", parse({ colour: "tan" }), "relevance", { page: 2 })).toBe("/search?q=oxford&colour=tan&page=2");
    expect(listingHref("/search?q=oxford", parse({}), "relevance")).toBe("/search?q=oxford");
  });

  it("toggles one value of a filter", () => {
    const state = parse({ colour: ["tan", "black"] });
    expect(toggleSelection(state, "colour", "tan")).toEqual({ colour: ["black"] });
    expect(toggleSelection(parse({ colour: "tan" }), "colour", "tan")).toEqual({});
  });
});

describe("category tree", () => {
  const tree: CategoryNode[] = [
    { id: "c-shoes", name: "Men's shoes", slug: "mens-shoes", path: "mens-shoes", parentId: null, depth: 0, position: 0, filterAttributeIds: ["a-size", "a-colour"] },
    { id: "c-formal", name: "Formal", slug: "formal", path: "mens-shoes/formal", parentId: "c-shoes", depth: 1, position: 0, filterAttributeIds: [] },
    { id: "c-oxfords", name: "Oxfords", slug: "oxfords", path: "mens-shoes/formal/oxfords", parentId: "c-formal", depth: 2, position: 0, filterAttributeIds: [] },
    { id: "c-watches", name: "Watches", slug: "watches", path: "watches", parentId: null, depth: 0, position: 1, filterAttributeIds: [] },
  ];

  it("collects descendants and ancestors", () => {
    expect([...descendantIds(tree, "c-shoes")].sort()).toEqual(["c-formal", "c-oxfords", "c-shoes"]);
    expect(ancestors(tree, "c-oxfords").map((c) => c.slug)).toEqual(["mens-shoes", "formal", "oxfords"]);
  });

  it("includes products from subcategories", () => {
    const inOxfords = product({ id: "o", categoryPositions: { "c-oxfords": 0 } });
    expect(productsInCategories([inOxfords], descendantIds(tree, "c-shoes"))).toHaveLength(1);
    expect(productsInCategories([inOxfords], descendantIds(tree, "c-watches"))).toHaveLength(0);
  });

  it("inherits filters from the nearest ancestor that has some", () => {
    expect(categoryFacets(tree, [colour, size, material], "c-oxfords").map((facet) => facet.key)).toEqual(["size_uk", "colour"]);
  });

  it("offers departments as a facet for search and sale", () => {
    const facet = departmentFacet(tree, "Category");
    expect(facet.kind === "category" && facet.options.map((option) => option.slug)).toEqual(["mens-shoes", "watches"]);
  });
});
