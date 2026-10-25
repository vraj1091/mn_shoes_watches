import { z } from "zod";
import { descendantIds } from "./query";
import type { AttributeMeta, CategoryNode, IndexedProduct } from "./types";

/**
 * Rule-based collections ("Watches under ₹10,000", "New in the last 60 days"). Rules are stored as
 * JSON on the Collection and checked against the catalogue index, so a rule collection always
 * reflects the current catalogue without anyone maintaining a product list.
 */
export const collectionRuleSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("category"), op: z.literal("in"), value: z.array(z.string()).min(1) }), // category paths
  z.object({ field: z.literal("price"), op: z.enum(["lte", "gte"]), value: z.number().int().nonnegative() }), // paise
  z.object({ field: z.literal("tag"), op: z.literal("in"), value: z.array(z.string()).min(1) }),
  z.object({ field: z.literal("attribute"), code: z.string(), op: z.literal("in"), value: z.array(z.string()).min(1) }),
  z.object({ field: z.literal("gender"), op: z.literal("in"), value: z.array(z.enum(["MEN", "WOMEN", "UNISEX"])).min(1) }),
  z.object({ field: z.literal("discounted"), op: z.literal("eq"), value: z.boolean() }),
  z.object({ field: z.literal("publishedWithinDays"), op: z.literal("lte"), value: z.number().int().positive() }),
]);

export type CollectionRule = z.infer<typeof collectionRuleSchema>;

export const collectionRulesSchema = z.array(collectionRuleSchema);

type Context = { categories: CategoryNode[]; attributes: AttributeMeta[]; now: number };

function ruleMatcher(rule: CollectionRule, context: Context): (product: IndexedProduct) => boolean {
  switch (rule.field) {
    case "category": {
      const ids = new Set<string>();
      for (const path of rule.value) {
        const category = context.categories.find((node) => node.path === path);
        if (category) for (const id of descendantIds(context.categories, category.id)) ids.add(id);
      }
      return (product) => Object.keys(product.categoryPositions).some((id) => ids.has(id));
    }
    case "price":
      return rule.op === "lte" ? (product) => product.minPrice <= rule.value : (product) => product.minPrice >= rule.value;
    case "tag":
      return (product) => product.tagSlugs.some((slug) => rule.value.includes(slug));
    case "attribute": {
      const attribute = context.attributes.find((item) => item.code === rule.code);
      if (!attribute) return () => false;
      const ids = attribute.values.filter((value) => rule.value.includes(value.slug)).map((value) => value.id);
      const pool = (product: IndexedProduct) => (attribute.isVariantAxis ? product.availableAxisValueIds : product.attributeValueIds);
      return (product) => ids.some((id) => pool(product).includes(id));
    }
    case "gender":
      return (product) => product.gender !== null && rule.value.includes(product.gender);
    case "discounted":
      return (product) => (product.maxDiscountBp > 0) === rule.value;
    case "publishedWithinDays":
      return (product) => context.now - product.publishedAt <= rule.value * 24 * 60 * 60 * 1000;
  }
}

export function applyCollectionRules(
  products: IndexedProduct[],
  rules: CollectionRule[],
  matchAll: boolean,
  context: Context,
): IndexedProduct[] {
  if (rules.length === 0) return products;
  const matchers = rules.map((rule) => ruleMatcher(rule, context));
  return products.filter((product) => (matchAll ? matchers.every((match) => match(product)) : matchers.some((match) => match(product))));
}
