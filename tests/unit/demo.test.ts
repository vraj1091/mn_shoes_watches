import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ATTRIBUTES, CATEGORY_TREE, TEMPLATES, type CategorySeed } from "@/prisma/seed/catalog";
import { PAGES } from "@/prisma/seed/pages";
import { BRANDS, DEMO_PAIRINGS, DEMO_PRODUCTS, DUMMY_PRODUCTS, PLACEHOLDER_PRODUCTS } from "@/prisma/demo/products";
import { DEMO_BANNERS, DEMO_COUPONS, DEMO_ORDERS, DEMO_POSTS } from "@/prisma/demo/content";
import { compareAtFromDiscount, inrFromUsd } from "@/prisma/demo/pricing";
import { placeholderSvg } from "@/prisma/demo/placeholder-svg";
import { demoReview } from "@/prisma/demo/reviews";

const paths: string[] = [];
const walk = (nodes: CategorySeed[], parent = "") => {
  for (const node of nodes) {
    const path = parent ? `${parent}/${node.slug}` : node.slug;
    paths.push(path);
    walk(node.children ?? [], path);
  }
};
walk(CATEGORY_TREE);

describe("demo prices", () => {
  it("converts dollars to rupee prices ending in 99", () => {
    expect(inrFromUsd(149.99)).toBe(12_699_00); // 149.99 × 85 = 12,749 → ₹12,699
    expect(inrFromUsd(19.99)).toBe(1_699_00);
    expect(inrFromUsd(13_999.99)).toBe(11_89_999_00);
    for (const usd of [9.99, 24.99, 89.99, 1499.99]) expect((inrFromUsd(usd) / 100) % 100).toBe(99);
  });

  it("sets a compare-at price only for discounts of 8% or more", () => {
    expect(compareAtFromDiscount(79.99, 18.04)).toBeGreaterThan(inrFromUsd(79.99));
    expect(compareAtFromDiscount(149.99, 4.12)).toBeNull();
    expect(compareAtFromDiscount(99.99, 8)).not.toBeNull();
  });
});

describe("demo catalogue", () => {
  const attributes = new Map(ATTRIBUTES.map((attribute) => [attribute.code, attribute]));

  it("maps the 26 DummyJSON products and 20 placeholder products, two per photo-less category", () => {
    expect(DUMMY_PRODUCTS).toHaveLength(26);
    expect(PLACEHOLDER_PRODUCTS).toHaveLength(20);
    const byCategory = new Map<string, number>();
    for (const product of PLACEHOLDER_PRODUCTS) {
      const key = product.categories[0]!.split("/").slice(0, 2).join("/");
      byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
    }
    for (const count of byCategory.values()) expect(count).toBe(2);
  });

  it("files every product in existing categories with known attribute values", () => {
    for (const product of DEMO_PRODUCTS) {
      for (const path of product.categories) expect(paths, product.slug).toContain(path);
      const template = TEMPLATES.find((item) => item.code === product.template)!;
      for (const [code, raw] of [...Object.entries(product.attributes), ...product.axes]) {
        const attribute = attributes.get(code);
        expect(attribute, `${product.slug}: ${code}`).toBeDefined();
        expect(template.attributes, `${product.slug}: ${code}`).toContain(code);
        if (attribute!.type === "NUMBER") continue;
        const known = new Set((attribute!.values ?? []).map((value) => (typeof value === "string" ? value : value.value)));
        for (const value of Array.isArray(raw) ? raw : [String(raw)]) expect(known.has(value), `${product.slug}: ${code} = ${value}`).toBe(true);
      }
    }
  });

  it("has one stock number per variant, sold-out shoe sizes and low-stock items", () => {
    for (const product of DEMO_PRODUCTS) {
      const variants = product.axes.reduce((count, [, values]) => count * values.length, 1);
      expect(product.stock, product.slug).toHaveLength(variants);
    }
    const shoes = DEMO_PRODUCTS.filter((product) => product.axes.some(([code]) => code === "size_uk"));
    expect(shoes.every((shoe) => shoe.axes.find(([code]) => code === "size_uk")![1].join() === "UK 6,UK 7,UK 8,UK 9,UK 10,UK 11")).toBe(true);
    expect(shoes.some((shoe) => shoe.stock.includes(0))).toBe(true);
    expect(DEMO_PRODUCTS.filter((product) => product.axes.length === 0 && product.stock[0]! > 0 && product.stock[0]! <= 5).length).toBeGreaterThanOrEqual(3);
  });

  it("has unique slugs, known brands and pairings between existing products", () => {
    const slugs = DEMO_PRODUCTS.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const brands = new Set(BRANDS.map((brand) => brand.name));
    for (const product of DEMO_PRODUCTS) expect(brands.has(product.brand), product.brand).toBe(true);
    for (const [from, related] of Object.entries(DEMO_PAIRINGS)) {
      expect(slugs, from).toContain(from);
      for (const slug of related) expect(slugs, slug).toContain(slug);
    }
    for (const banner of DEMO_BANNERS) expect(slugs).toContain(banner.productSlug);
    for (const post of DEMO_POSTS) expect(slugs).toContain(post.coverProductSlug);
    for (const order of DEMO_ORDERS) for (const [slug] of order.items) expect(slugs).toContain(slug);
  });

  it("renames DummyJSON's generic brands", () => {
    const names = BRANDS.map((brand) => brand.name);
    for (const generic of ["Fashion Timepieces", "Fashion Gold", "Fashion Co.", "Fashion Shades", "Fashion Fun"]) expect(names).not.toContain(generic);
    expect(names).toEqual(expect.arrayContaining(["Heritage Time", "Aurelle", "Solaris"]));
  });

  it("opens each product's copy with a sentence that says what it is, in plain words", () => {
    const banned = /\b(elevate|unleash|seamless|revolutionise|game-changer)\b|discover the perfect|welcome to our store/i;
    for (const product of DEMO_PRODUCTS) {
      expect(product.summary.length, product.slug).toBeGreaterThan(40);
      expect(product.description[0]!.startsWith(product.summary.split(":")[0]!.split(",")[0]!.slice(0, 10)), product.slug).toBe(true);
      expect(JSON.stringify(product), product.slug).not.toMatch(banned);
    }
    expect(JSON.stringify({ PAGES, DEMO_POSTS, DEMO_BANNERS })).not.toMatch(banned);
  });

  it("covers every order status, and both coupons from the brief", () => {
    const statuses = new Set(DEMO_ORDERS.map((order) => order.status));
    expect(statuses.size).toBe(9);
    expect(DEMO_ORDERS).toHaveLength(10);
    expect(Math.max(...DEMO_ORDERS.map((order) => order.daysAgo))).toBeLessThanOrEqual(14);
    expect(DEMO_COUPONS.map((coupon) => [coupon.code, coupon.minOrderValue])).toEqual([
      ["WELCOME10", 999_00],
      ["FLAT500", 4_999_00],
    ]);
  });

  it("draws placeholder images on a transparent background (the theme's tile shows through), with the name escaped", () => {
    const svg = placeholderSvg("belt", "Belt & <buckle>");
    expect(svg).not.toContain('<rect width="1000" height="1000"');
    expect(svg).toContain('stroke="#6B6158"');
    expect(svg).toContain("Belt &amp; &lt;buckle&gt;");
    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("matches the saved DummyJSON copy, when one exists", () => {
    if (!existsSync("prisma/demo/dummyjson.json")) return;
    const saved = JSON.parse(readFileSync("prisma/demo/dummyjson.json", "utf8")) as Record<string, { title: string }[]>;
    for (const product of DUMMY_PRODUCTS) {
      expect(saved[product.dummy.category]!.map((item) => item.title), product.dummy.title).toContain(product.dummy.title);
    }
  });

  it("writes demo reviews that do not repeat on a product, or among the five-star ones of a kind", () => {
    const saved = JSON.parse(readFileSync("prisma/demo/dummyjson.json", "utf8")) as Record<string, { title: string; reviews: { rating: number }[] }[]>;
    const firstFiveStar = new Map<string, string[]>();
    for (const product of DUMMY_PRODUCTS) {
      const reviews = saved[product.dummy.category]!.find((item) => item.title === product.dummy.title)!.reviews;
      const written = reviews.map((review, position) => demoReview(product.dummy.category, product.slug, Math.round(review.rating), position));
      expect(new Set(written.map((review) => review.body)).size, product.slug).toBe(written.length);
      expect(new Set(written.map((review) => review.authorName)).size, product.slug).toBe(written.length);
      const kind = firstFiveStar.get(product.dummy.category) ?? [];
      kind.push(demoReview(product.dummy.category, product.slug, 5, 0).body);
      firstFiveStar.set(product.dummy.category, kind);
    }
    for (const [kind, bodies] of firstFiveStar) expect(new Set(bodies).size, kind).toBe(bodies.length);
    const firstNames = DUMMY_PRODUCTS.map((product) => demoReview(product.dummy.category, product.slug, 5, 0).authorName);
    expect(new Set(firstNames).size).toBe(firstNames.length);
  });
});
