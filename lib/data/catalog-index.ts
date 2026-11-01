import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";
import { mediaUrl } from "@/lib/media/url";
import { z } from "zod";
import type { AttributeMeta, CardImage, CatalogIndex, CategoryNode, IndexedProduct, Swatch } from "@/lib/catalog/types";

const badgeList = z.array(z.string().min(1)).max(3);

/*
 * Every active product, its filterable values and stock in one cached object. Category pages,
 * collections, the sale page and search all filter, count and sort from this index in memory,
 * which stays fast for a single shop's catalogue (thousands of products) and keeps the
 * listing logic in pure, testable functions (lib/catalog/query.ts).
 */

async function loadCatalogIndex(): Promise<CatalogIndex> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.products, tags.categories, tags.settings, tags.brands);

  const [settings, attributes, categories, products] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { storeId: DEFAULT_STORE_ID }, select: { lowStockThreshold: true } }),
    prisma.attribute.findMany({
      where: { storeId: DEFAULT_STORE_ID },
      include: { values: { orderBy: [{ sortKey: "asc" }, { position: "asc" }] } },
      orderBy: { position: "asc" },
    }),
    prisma.category.findMany({
      where: { storeId: DEFAULT_STORE_ID, isActive: true },
      include: { filters: { orderBy: { position: "asc" }, select: { attributeId: true } } },
      orderBy: [{ depth: "asc" }, { position: "asc" }],
    }),
    prisma.product.findMany({
      where: { storeId: DEFAULT_STORE_ID, status: "ACTIVE" },
      include: {
        categories: { select: { categoryId: true, position: true } },
        attributeValues: { select: { attributeId: true, valueId: true, numberValue: true } },
        variants: {
          where: { isActive: true },
          select: {
            price: true,
            compareAtPrice: true,
            stockOnHand: true,
            options: { select: { valueId: true } },
          },
        },
        tags: { select: { tag: { select: { slug: true } } } },
        brand: { select: { id: true, name: true, slug: true, isActive: true } },
        media: {
          where: { role: "GALLERY" },
          orderBy: { position: "asc" },
          take: 2,
          include: { media: true },
        },
      },
    }),
  ]);

  const attributeMetas: AttributeMeta[] = attributes.map((attribute) => ({
    id: attribute.id,
    code: attribute.code,
    name: attribute.name,
    type: attribute.type,
    unit: attribute.unit,
    isVariantAxis: attribute.isVariantAxis,
    isFilterable: attribute.isFilterable,
    filterStyle: attribute.filterStyle,
    position: attribute.position,
    values: attribute.values.map((value) => ({
      id: value.id,
      value: value.value,
      slug: value.slug,
      swatchHex: value.swatchHex,
      sortKey: value.sortKey,
      position: value.position,
    })),
  }));

  // Values that render as colour swatches on cards: variant axes shown as swatches.
  const swatchValues = new Map<string, Swatch>();
  for (const attribute of attributeMetas) {
    if (!attribute.isVariantAxis || attribute.filterStyle !== "SWATCH") continue;
    for (const value of attribute.values) {
      if (value.swatchHex) swatchValues.set(value.id, { valueId: value.id, label: value.value, hex: value.swatchHex });
    }
  }

  const categoryNodes: CategoryNode[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    path: category.path,
    parentId: category.parentId,
    depth: category.depth,
    position: category.position,
    filterAttributeIds: category.filters.map((filter) => filter.attributeId),
  }));

  const toImage = (entry: (typeof products)[number]["media"][number] | undefined): CardImage | null => {
    const media = entry?.media;
    if (!media || media.kind !== "IMAGE" || !media.key) return null;
    return {
      url: mediaUrl(media.key),
      alt: media.alt ?? "",
      width: media.width ?? 1200,
      height: media.height ?? 1500,
      blurDataUrl: media.blurDataUrl,
    };
  };

  const axisAttributeIds = new Set(attributeMetas.filter((attribute) => attribute.isVariantAxis).map((attribute) => attribute.id));

  const indexed: IndexedProduct[] = products.map((product) => {
    const cheapest = [...product.variants].sort((a, b) => a.price - b.price)[0];
    const available = new Set<string>();
    const swatches = new Map<string, Swatch>();
    let stockTotal = 0;
    for (const variant of product.variants) {
      stockTotal += Math.max(0, variant.stockOnHand);
      for (const option of variant.options) {
        if (variant.stockOnHand > 0) available.add(option.valueId);
        const swatch = swatchValues.get(option.valueId);
        if (swatch) swatches.set(swatch.valueId, swatch);
      }
    }
    const numberValues: Record<string, number> = {};
    const attributeValueIds: string[] = [];
    for (const value of product.attributeValues) {
      if (value.valueId) {
        attributeValueIds.push(value.valueId);
        // A single-variant product records its colour or volume at product level; it is
        // available in that colour while the product is in stock.
        if (axisAttributeIds.has(value.attributeId) && product.inStock) available.add(value.valueId);
      } else if (value.numberValue !== null) numberValues[value.attributeId] = value.numberValue;
    }
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      primaryCategoryId: product.primaryCategoryId,
      categoryPositions: Object.fromEntries(product.categories.map((entry) => [entry.categoryId, entry.position])),
      gender: product.gender,
      minPrice: product.minPrice,
      maxPrice: product.maxPrice,
      compareAtPrice: cheapest?.compareAtPrice && cheapest.compareAtPrice > cheapest.price ? cheapest.compareAtPrice : null,
      maxDiscountBp: product.maxDiscountBp,
      inStock: product.inStock,
      stockTotal,
      bestsellerScore: product.bestsellerScore,
      publishedAt: (product.publishedAt ?? product.createdAt).getTime(),
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      attributeValueIds,
      numberValues,
      availableAxisValueIds: [...available],
      swatches: [...swatches.values()],
      tagSlugs: product.tags.map((entry) => entry.tag.slug),
      brand: product.brand?.isActive ? { id: product.brand.id, name: product.brand.name, slug: product.brand.slug } : null,
      badges: badgeList.catch([]).parse(product.badges ?? []),
      isPlaceholderPhoto: product.isPlaceholderPhoto,
      image: toImage(product.media[0]),
      hoverImage: toImage(product.media[1]),
    };
  });

  return {
    products: indexed,
    attributes: attributeMetas,
    categories: categoryNodes,
    lowStockThreshold: settings?.lowStockThreshold ?? 5,
  };
}

/** The catalogue index for this request (read once per render, cached across requests). */
export const getCatalogIndex = cache(async (): Promise<CatalogIndex> => {
  await connection();
  return loadCatalogIndex();
});
