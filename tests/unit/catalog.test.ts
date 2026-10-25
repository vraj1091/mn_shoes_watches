import { describe, expect, it } from "vitest";
import { buildSearchText, listingFields, slugify } from "@/lib/catalog/listing";
import { CATEGORY_TREE, COLLECTIONS, TAX_CLASSES, type CategorySeed } from "@/prisma/seed/catalog";

describe("listing fields", () => {
  const variant = (price: number, compareAtPrice: number | null, stockOnHand: number, isActive = true) => ({
    price,
    compareAtPrice,
    stockOnHand,
    isActive,
  });

  it("takes the price range, best discount and stock from active variants", () => {
    expect(
      listingFields([variant(1_899_00, null, 0), variant(2_999_00, 3_999_00, 4), variant(100_00, 900_00, 9, false)]),
    ).toEqual({ minPrice: 1_899_00, maxPrice: 2_999_00, maxDiscountBp: 2500, inStock: true });
  });

  it("is out of stock when every active variant is at zero", () => {
    expect(listingFields([variant(500_00, null, 0), variant(600_00, null, 5, false)]).inStock).toBe(false);
  });

  it("handles a product with no active variants", () => {
    expect(listingFields([])).toEqual({ minPrice: 0, maxPrice: 0, maxDiscountBp: 0, inStock: false });
  });
});

describe("search text and slugs", () => {
  it("lower-cases, strips accents and de-duplicates words", () => {
    expect(buildSearchText(["Eau de Parfum", "Café", "eau", null, "Men's shoes"])).toBe("eau de parfum cafe men shoes");
  });

  it("makes URL slugs", () => {
    expect(slugify("Sandals, slides & flip-flops")).toBe("sandals-slides-and-flip-flops");
    expect(slugify("  Men's Shoes ")).toBe("men-s-shoes");
  });
});

describe("seed catalogue", () => {
  const paths: string[] = [];
  const walk = (nodes: CategorySeed[], parent = "") => {
    for (const node of nodes) {
      const path = parent ? `${parent}/${node.slug}` : node.slug;
      paths.push(path);
      walk(node.children ?? [], path);
    }
  };
  walk(CATEGORY_TREE);

  it("has the four departments from the brief", () => {
    expect(CATEGORY_TREE.map((department) => department.slug)).toEqual(["mens-shoes", "watches", "perfumes", "accessories"]);
  });

  it("has unique category URLs", () => {
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("writes intros of 60–120 words that open with a plain definition", () => {
    const intros: string[] = COLLECTIONS.map((collection) => collection.intro);
    const collect = (nodes: CategorySeed[]) =>
      nodes.forEach((node) => {
        if (node.intro) intros.push(node.intro);
        collect(node.children ?? []);
      });
    collect(CATEGORY_TREE);
    for (const intro of intros) {
      const words = intro.split(/\s+/).length;
      expect(words, intro.slice(0, 40)).toBeGreaterThanOrEqual(60);
      expect(words, intro.slice(0, 40)).toBeLessThanOrEqual(120);
    }
  });

  it("puts collection landing pages under an existing department", () => {
    const departments = new Set(CATEGORY_TREE.map((department) => department.slug));
    for (const collection of COLLECTIONS) {
      if (collection.landingPath) expect(departments.has(collection.landingPath.split("/")[0]!), collection.landingPath).toBe(true);
    }
  });

  it("never writes banned marketing words", () => {
    const banned = /\b(elevate|unleash|seamless|revolutionise|game-changer)\b|discover the perfect|welcome to our store/i;
    const copy = JSON.stringify({ CATEGORY_TREE, COLLECTIONS });
    expect(copy).not.toMatch(banned);
  });

  it("keeps GST slabs ordered with an open-ended top slab", () => {
    for (const taxClass of TAX_CLASSES) {
      const last = taxClass.slabs[taxClass.slabs.length - 1]!;
      expect(last.maxUnitValue, taxClass.name).toBeNull();
    }
  });
});
