import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";
import { mediaUrl } from "@/lib/media/url";
import { collectionRulesSchema, type CollectionRule } from "@/lib/catalog/rules";
import { formatNumberSpec } from "@/lib/catalog/specs";
import type { OptionDef, VariantDef } from "@/lib/catalog/variants";
import type { SortKey } from "@/lib/catalog/query";
import type { Synonym } from "@/lib/search/text";

const faqSchema = z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) }));
const stringList = z.array(z.string());
// Extra key specs the attributes do not cover, typed in the admin.
const specListSchema = z.array(z.object({ label: z.string().min(1), value: z.string() }));
const sizeChartTableSchema = z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.string())) });

export type Faq = z.infer<typeof faqSchema>[number];

const SORT_FROM_DB: Record<string, SortKey> = {
  FEATURED: "relevance",
  NEWEST: "newest",
  PRICE_ASC: "price-asc",
  PRICE_DESC: "price-desc",
  BESTSELLING: "bestselling",
};

// ─── Categories ─────────────────────────────────────────────────────────────

async function loadCategory(path: string) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.categories);
  const category = await prisma.category.findUnique({
    where: { storeId_path: { storeId: DEFAULT_STORE_ID, path } },
  });
  if (!category?.isActive) return null;
  return {
    id: category.id,
    name: category.name,
    path: category.path,
    depth: category.depth,
    intro: category.intro,
    buyingGuideHtml: category.buyingGuideHtml,
    faqs: faqSchema.catch([]).parse(category.faqs ?? []),
    metaTitle: category.metaTitle,
    metaDescription: category.metaDescription,
    noindex: category.noindex,
  };
}

export type CategoryPage = NonNullable<Awaited<ReturnType<typeof loadCategory>>>;

export async function getCategoryByPath(path: string): Promise<CategoryPage | null> {
  await connection();
  return loadCategory(path);
}

// ─── Collections ────────────────────────────────────────────────────────────

async function loadCollection(by: "slug" | "landingPath", value: string) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.collections);
  const collection = await prisma.collection.findFirst({
    where: { storeId: DEFAULT_STORE_ID, isActive: true, [by]: value },
    include: { products: { select: { productId: true, position: true } } },
  });
  if (!collection) return null;
  return {
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    landingPath: collection.landingPath,
    type: collection.type,
    rules: collectionRulesSchema.catch([]).parse(collection.rules ?? []) as CollectionRule[],
    matchAll: collection.matchAll,
    manualProducts: Object.fromEntries(collection.products.map((entry) => [entry.productId, entry.position])),
    defaultSort: SORT_FROM_DB[collection.defaultSort] ?? "relevance",
    intro: collection.intro,
    descriptionHtml: collection.descriptionHtml,
    faqs: faqSchema.catch([]).parse(collection.faqs ?? []),
    metaTitle: collection.metaTitle,
    metaDescription: collection.metaDescription,
    noindex: collection.noindex,
  };
}

export type CollectionPage = NonNullable<Awaited<ReturnType<typeof loadCollection>>>;

export async function getCollectionBySlug(slug: string): Promise<CollectionPage | null> {
  await connection();
  return loadCollection("slug", slug);
}

export async function getCollectionByLandingPath(path: string): Promise<CollectionPage | null> {
  await connection();
  return loadCollection("landingPath", path);
}

// ─── Products ───────────────────────────────────────────────────────────────

const PYRAMID_CODES = new Set(["top_notes", "heart_notes", "base_notes"]);

async function loadProduct(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.products, tags.product(slug), tags.brands);

  const product = await prisma.product.findUnique({
    where: { storeId_slug: { storeId: DEFAULT_STORE_ID, slug } },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        include: { options: { include: { option: { select: { attributeId: true } } } } },
      },
      options: {
        orderBy: { position: "asc" },
        include: { attribute: { include: { values: { orderBy: [{ sortKey: "asc" }, { position: "asc" }] } } } },
      },
      attributeValues: { include: { attribute: true, value: true } },
      media: { orderBy: { position: "asc" }, include: { media: { include: { poster: true } } } },
      sizeChart: true,
      relations: { where: { type: "COMPLETE_THE_LOOK" }, orderBy: { position: "asc" }, select: { relatedId: true } },
      replacement: { select: { slug: true, status: true } },
      brand: { select: { name: true, slug: true, isActive: true } },
    },
  });
  if (!product) return null;
  if (product.status === "ARCHIVED") {
    return { kind: "archived" as const, replacementSlug: product.replacement?.status === "ACTIVE" ? product.replacement.slug : null };
  }
  if (product.status !== "ACTIVE") return null;

  // Size chart: the product's own, or the nearest category up the tree that has one.
  let sizeChart: NonNullable<typeof product.sizeChart> | null = product.sizeChart;
  let categoryId = product.primaryCategoryId;
  while (!sizeChart && categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { sizeChart: true, parentId: true },
    });
    sizeChart = category?.sizeChart ?? null;
    categoryId = category?.parentId ?? null;
  }

  const usedValueIds = new Set(product.variants.flatMap((variant) => variant.options.map((option) => option.valueId)));
  const options: OptionDef[] = product.options.map((option) => ({
    attributeId: option.attributeId,
    code: option.attribute.code,
    name: option.attribute.name,
    style: option.attribute.filterStyle === "SWATCH" ? "SWATCH" : "BUTTON",
    values: option.attribute.values
      .filter((value) => usedValueIds.has(value.id))
      .map((value) => ({ id: value.id, label: value.value, hex: value.swatchHex })),
  }));

  const variants: VariantDef[] = product.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    title: variant.title,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    stock: Math.max(0, variant.stockOnHand),
    values: Object.fromEntries(variant.options.map((option) => [option.option.attributeId, option.valueId])),
  }));

  // Product-level attributes, grouped and in the admin's attribute order.
  const grouped = new Map<string, { code: string; name: string; unit: string | null; position: number; labels: string[]; number: number | null }>();
  for (const entry of product.attributeValues) {
    const group = grouped.get(entry.attributeId) ?? {
      code: entry.attribute.code,
      name: entry.attribute.name,
      unit: entry.attribute.unit,
      position: entry.attribute.position,
      labels: [],
      number: null,
    };
    if (entry.value) group.labels.push(entry.value.value);
    if (entry.numberValue !== null) group.number = entry.numberValue;
    grouped.set(entry.attributeId, group);
  }
  const attributes = Object.fromEntries([...grouped.values()].map((group) => [group.code, group]));
  const specs = [...grouped.values()]
    .filter((group) => !PYRAMID_CODES.has(group.code))
    .sort((a, b) => a.position - b.position)
    .map((group) => ({
      label: group.name,
      value: group.number !== null ? formatNumberSpec(group.number, group.unit) : group.labels.join(", "),
    }))
    .concat(specListSchema.catch([]).parse(product.specs ?? []))
    .filter((spec) => spec.value);

  const images = product.media
    .filter((entry) => entry.role === "GALLERY" && entry.media.kind === "IMAGE" && entry.media.key)
    .map((entry) => ({
      url: mediaUrl(entry.media.key!),
      alt: entry.media.alt ?? product.title,
      width: entry.media.width ?? 1200,
      height: entry.media.height ?? 1500,
      blurDataUrl: entry.media.blurDataUrl,
      optionValueId: entry.optionValueId,
    }));

  const table = sizeChart ? sizeChartTableSchema.safeParse(sizeChart.table) : null;

  return {
    kind: "active" as const,
    id: product.id,
    slug: product.slug,
    title: product.title,
    summary: product.summary,
    descriptionHtml: product.descriptionHtml,
    highlights: stringList.catch([]).parse(product.highlights ?? []),
    care: product.care,
    warranty: product.warranty,
    warrantyMonths: product.warrantyMonths,
    gender: product.gender,
    primaryCategoryId: product.primaryCategoryId,
    options,
    variants,
    attributes,
    specs,
    images,
    sizeChart: table?.success ? { name: sizeChart!.name, table: table.data, howToMeasureHtml: sizeChart!.howToMeasureHtml } : null,
    completeTheLookIds: product.relations.map((relation) => relation.relatedId),
    faqs: faqSchema.catch([]).parse(product.faqs ?? []),
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    noindex: product.noindex,
    brand: product.brand?.isActive ? { name: product.brand.name, slug: product.brand.slug } : null,
    badges: z.array(z.string()).catch([]).parse(product.badges ?? []),
    videoUrl: product.videoUrl,
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
    isPlaceholderPhoto: product.isPlaceholderPhoto,
  };
}

export type ProductPageData = Extract<NonNullable<Awaited<ReturnType<typeof loadProduct>>>, { kind: "active" }>;
export type ProductLookup = Awaited<ReturnType<typeof loadProduct>>;

export async function getProductBySlug(slug: string): Promise<ProductLookup> {
  await connection();
  return loadProduct(slug);
}

// ─── Search synonyms ────────────────────────────────────────────────────────

async function loadSynonyms(): Promise<Synonym[]> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.synonyms);
  return prisma.searchSynonym.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    select: { term: true, synonym: true, twoWay: true },
  });
}

export async function getSynonyms(): Promise<Synonym[]> {
  await connection();
  return loadSynonyms();
}
