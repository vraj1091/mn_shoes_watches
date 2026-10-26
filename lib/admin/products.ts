import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { mediaUrl } from "@/lib/media/url";

export const PRODUCT_STATUS_LABELS = { DRAFT: "Draft", ACTIVE: "Active", SCHEDULED: "Scheduled", ARCHIVED: "Archived" } as const;
export type ProductStatusName = keyof typeof PRODUCT_STATUS_LABELS;

export type ProductFilters = { q: string; status: string; category: string; brand: string; stock: string; photo: string; page: number };

const PAGE_SIZE = 30;

export async function listProducts(filters: ProductFilters) {
  const settings = await prisma.storeSettings.findUnique({ where: { storeId: DEFAULT_STORE_ID }, select: { lowStockThreshold: true } });
  const threshold = settings?.lowStockThreshold ?? 5;
  const search = filters.q.trim();
  const where: Prisma.ProductWhereInput = {
    storeId: DEFAULT_STORE_ID,
    ...(filters.status in PRODUCT_STATUS_LABELS ? { status: filters.status as ProductStatusName } : { status: { not: "ARCHIVED" } }),
    ...(filters.brand === "none" ? { brandId: null } : filters.brand ? { brandId: filters.brand } : {}),
    ...(filters.stock === "out" ? { variants: { some: { isActive: true } }, inStock: false } : {}),
    ...(filters.stock === "low" ? { variants: { some: { isActive: true, stockOnHand: { lte: threshold } } } } : {}),
    ...(filters.photo === "placeholder" ? { isPlaceholderPhoto: true } : {}),
    ...(filters.photo === "none" ? { media: { none: {} } } : {}),
    ...(search
      ? { OR: [{ title: { contains: search } }, { slug: { contains: search.toLowerCase() } }, { variants: { some: { sku: { contains: search.toUpperCase() } } } }, { brand: { name: { contains: search } } }] }
      : {}),
  };
  // A category includes everything in its subcategories.
  if (filters.category) {
    const category = await prisma.category.findFirst({ where: { id: filters.category, storeId: DEFAULT_STORE_ID }, select: { path: true } });
    where.categories = category ? { some: { category: { OR: [{ id: filters.category }, { path: { startsWith: `${category.path}/` } }] } } } : { some: { categoryId: filters.category } };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        isDemo: true,
        isPlaceholderPhoto: true,
        minPrice: true,
        maxPrice: true,
        brand: { select: { name: true } },
        primaryCategory: { select: { name: true } },
        media: { where: { role: "GALLERY" }, orderBy: { position: "asc" }, take: 1, select: { media: { select: { key: true, alt: true } } } },
        variants: { where: { isActive: true }, select: { stockOnHand: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  return {
    total,
    threshold,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    products: products.map((product) => {
      const stock = product.variants.reduce((sum, variant) => sum + variant.stockOnHand, 0);
      const image = product.media[0]?.media;
      return {
        ...product,
        stock,
        lowVariants: product.variants.filter((variant) => variant.stockOnHand <= threshold).length,
        variantCount: product.variants.length,
        image: image?.key ? { url: mediaUrl(image.key), alt: image.alt ?? "" } : null,
      };
    }),
  };
}

/** Everything the product editor needs in one read. */
export async function getProductForEdit(id: string) {
  return prisma.product.findFirst({
    where: { id, storeId: DEFAULT_STORE_ID },
    include: {
      brand: { select: { id: true, name: true } },
      categories: { select: { categoryId: true } },
      media: { orderBy: [{ role: "asc" }, { position: "asc" }], include: { media: true } },
      variants: { orderBy: { position: "asc" }, include: { options: { include: { option: { include: { attribute: true } }, value: true } } } },
      options: { orderBy: { position: "asc" }, include: { attribute: true } },
      attributeValues: true,
      _count: { select: { orderItems: true } },
    },
  });
}

export type EditableProduct = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;

/** Categories as an indented list for selects, in menu order. */
export async function categoryOptions() {
  const categories = await prisma.category.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    orderBy: [{ depth: "asc" }, { position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, path: true, depth: true, parentId: true, isActive: true, attributeTemplateId: true },
  });
  const children = new Map<string | null, typeof categories>();
  for (const category of categories) {
    const list = children.get(category.parentId) ?? [];
    list.push(category);
    children.set(category.parentId, list);
  }
  const ordered: (typeof categories)[number][] = [];
  const walk = (parentId: string | null) => {
    for (const category of children.get(parentId) ?? []) {
      ordered.push(category);
      walk(category.id);
    }
  };
  walk(null);
  return ordered;
}

export async function brandOptions() {
  return prisma.brand.findMany({ where: { storeId: DEFAULT_STORE_ID }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

/**
 * The filter attributes that apply to a category: those of the nearest category up the tree that
 * has an attribute template (Shoes, Watches, Perfumes, Accessories).
 */
export async function attributesForCategory(categoryId: string | null) {
  let current = categoryId ? await prisma.category.findUnique({ where: { id: categoryId }, select: { parentId: true, attributeTemplateId: true } }) : null;
  while (current && !current.attributeTemplateId && current.parentId) {
    current = await prisma.category.findUnique({ where: { id: current.parentId }, select: { parentId: true, attributeTemplateId: true } });
  }
  if (!current?.attributeTemplateId) return [];
  const template = await prisma.attributeTemplate.findUnique({
    where: { id: current.attributeTemplateId },
    include: { attributes: { orderBy: { position: "asc" }, include: { attribute: { include: { values: { orderBy: [{ sortKey: "asc" }, { position: "asc" }, { value: "asc" }] } } } } } },
  });
  return template?.attributes.map((entry) => entry.attribute) ?? [];
}

export type EditorAttribute = Awaited<ReturnType<typeof attributesForCategory>>[number];
