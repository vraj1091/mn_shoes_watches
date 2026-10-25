import { describe, expect, it } from "vitest";
import { applyCollectionRules, collectionRulesSchema } from "@/lib/catalog/rules";
import { findVariant, initialSelection, isValueAvailable, priceSummary, valueExists, type OptionDef, type VariantDef } from "@/lib/catalog/variants";
import { describeWaterResistance, formatNumberSpec } from "@/lib/catalog/specs";
import { buildFtsQuery, expandSynonyms, levenshtein, normalise, suggestSpelling, tokenize } from "@/lib/search/text";
import type { CategoryNode, IndexedProduct } from "@/lib/catalog/types";

const base: IndexedProduct = {
  id: "",
  slug: "",
  title: "",
  primaryCategoryId: null,
  categoryPositions: {},
  gender: "MEN",
  minPrice: 0,
  maxPrice: 0,
  compareAtPrice: null,
  maxDiscountBp: 0,
  inStock: true,
  stockTotal: 1,
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
};

describe("collection rules", () => {
  const categories: CategoryNode[] = [
    { id: "w", name: "Watches", slug: "watches", path: "watches", parentId: null, depth: 0, position: 0, filterAttributeIds: [] },
    { id: "wm", name: "Men", slug: "men", path: "watches/men", parentId: "w", depth: 1, position: 0, filterAttributeIds: [] },
    { id: "s", name: "Shoes", slug: "mens-shoes", path: "mens-shoes", parentId: null, depth: 0, position: 1, filterAttributeIds: [] },
  ];
  const day = 24 * 60 * 60 * 1000;
  const now = 100 * day;
  const products: IndexedProduct[] = [
    { ...base, id: "cheap-watch", categoryPositions: { wm: 0 }, minPrice: 5_495_00, publishedAt: now - 3 * day },
    { ...base, id: "dear-watch", categoryPositions: { wm: 0 }, minPrice: 14_500_00, publishedAt: now - 90 * day, maxDiscountBp: 1500 },
    { ...base, id: "shoe", categoryPositions: { s: 0 }, minPrice: 2_999_00, publishedAt: now - 10 * day, tagSlugs: ["wedding"] },
  ];
  const run = (rules: unknown, matchAll = true) =>
    applyCollectionRules(products, collectionRulesSchema.parse(rules), matchAll, { categories, attributes: [], now }).map((p) => p.id);

  it("combines a category (with its subcategories) and a price cap", () => {
    expect(run([{ field: "category", op: "in", value: ["watches"] }, { field: "price", op: "lte", value: 10_000_00 }])).toEqual(["cheap-watch"]);
  });

  it("supports any-of matching, tags, discounts and recency", () => {
    expect(run([{ field: "tag", op: "in", value: ["wedding"] }, { field: "discounted", op: "eq", value: true }], false)).toEqual(["dear-watch", "shoe"]);
    expect(run([{ field: "publishedWithinDays", op: "lte", value: 30 }])).toEqual(["cheap-watch", "shoe"]);
  });

  it("rejects malformed rules", () => {
    expect(() => collectionRulesSchema.parse([{ field: "price", op: "lt", value: 5 }])).toThrow();
  });
});

describe("variant selection", () => {
  const options: OptionDef[] = [
    { attributeId: "colour", code: "colour", name: "Colour", style: "SWATCH", values: [{ id: "black", label: "Black", hex: "#000" }, { id: "brown", label: "Brown", hex: "#5b3a24" }] },
    { attributeId: "size", code: "size_uk", name: "Size", style: "BUTTON", values: [{ id: "8", label: "UK 8", hex: null }, { id: "9", label: "UK 9", hex: null }] },
  ];
  const variant = (id: string, colour: string, size: string, stock: number, price = 4_499_00): VariantDef => ({
    id,
    sku: id,
    title: `${colour} / ${size}`,
    price,
    compareAtPrice: null,
    stock,
    values: { colour, size },
  });
  // Black: UK 8 sold out, UK 9 in stock. Brown: only UK 8 exists, and it is sold out.
  const variants = [variant("b8", "black", "8", 0), variant("b9", "black", "9", 3), variant("r8", "brown", "8", 0)];

  it("strikes through sizes that are sold out in the chosen colour", () => {
    expect(isValueAvailable(variants, { colour: "black" }, "size", "8")).toBe(false);
    expect(isValueAvailable(variants, { colour: "black" }, "size", "9")).toBe(true);
    expect(valueExists(variants, { colour: "brown" }, "size", "9")).toBe(false);
  });

  it("starts on an in-stock colour and leaves the size to the shopper", () => {
    expect(initialSelection(variants, options)).toEqual({ colour: "black" });
  });

  it("selects the variant named in the URL", () => {
    expect(initialSelection(variants, options, "r8")).toEqual({ colour: "brown", size: "8" });
  });

  it("finds a variant only once every option is chosen", () => {
    expect(findVariant(variants, options, { colour: "black" })).toBeNull();
    expect(findVariant(variants, options, { colour: "black", size: "9" })?.id).toBe("b9");
    expect(findVariant([variant("only", "x", "y", 1)], [], {})?.id).toBe("only");
  });

  it("shows 'from' only when variant prices differ", () => {
    expect(priceSummary(variants)).toMatchObject({ price: 4_499_00, from: false });
    expect(priceSummary([variant("a", "x", "50", 1, 1_899_00), variant("b", "x", "100", 1, 2_999_00)])).toMatchObject({ price: 1_899_00, from: true });
  });
});

describe("specs in plain words", () => {
  it.each([
    [0, "Not water-resistant"],
    [30, "splash-proof"],
    [50, "brief swimming"],
    [100, "swimming and snorkelling"],
    [300, "diving"],
  ])("%i m", (metres, phrase) => {
    expect(describeWaterResistance(metres)).toContain(phrase);
  });

  it("formats numbers with units", () => {
    expect(formatNumberSpec(42, "mm")).toBe("42 mm");
    expect(formatNumberSpec(2.5, "cm")).toBe("2.5 cm");
  });
});

describe("search text", () => {
  it("normalises queries", () => {
    expect(normalise("  Eau-de-Parfum, 100ML!! ")).toBe("eau de parfum 100ml");
    expect(tokenize("Men's  Oxford")).toEqual(["men", "s", "oxford"]);
  });

  it("replaces typos and adds two-way synonyms", () => {
    const synonyms = [
      { term: "sneker", synonym: "sneakers", twoWay: false },
      { term: "chronograph", synonym: "chrono", twoWay: true },
      { term: "edp", synonym: "eau de parfum", twoWay: true },
    ];
    expect(expandSynonyms(["sneker"], synonyms)).toEqual([["sneakers"]]);
    expect(expandSynonyms(["chrono"], synonyms)).toEqual([["chrono", "chronograph"]]);
    expect(expandSynonyms(["edp"], synonyms)).toEqual([["edp", "eau de parfum"]]);
  });

  it("builds an FTS query that cannot be broken by what a shopper types", () => {
    expect(buildFtsQuery([["oxford"], ["tan", "brown"]])).toBe('"oxford" AND ("tan" OR "brown")');
    expect(buildFtsQuery([['ox"ford']])).toBe('"oxford"');
    expect(buildFtsQuery([["uk"], ["8"]])).toBeNull();
    expect(buildFtsQuery([["oxford"], ["derby"]], "any")).toBe('"oxford" OR "derby"');
  });

  it("measures edit distance with an early exit", () => {
    expect(levenshtein("sneker", "sneaker")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("abc", "xyzxyz", 2)).toBeGreaterThan(2);
  });

  it("suggests the closest known word", () => {
    const vocabulary = new Map([
      ["chelsea", 3],
      ["chronograph", 2],
      ["oxford", 4],
      ["kolhapuri", 1],
    ]);
    expect(suggestSpelling(["chelse", "boot"], vocabulary)).toBe("chelsea boot");
    expect(suggestSpelling(["kolapuri"], vocabulary)).toBe("kolhapuri");
    expect(suggestSpelling(["oxford"], vocabulary)).toBeNull();
    expect(suggestSpelling(["zzzzzz"], vocabulary)).toBeNull();
  });
});
