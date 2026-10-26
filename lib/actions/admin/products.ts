"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { requireStaff } from "@/lib/auth/session";
import { refreshStorefront } from "@/lib/admin/refresh";
import { attributesForCategory } from "@/lib/admin/products";
import { buildSearchText, listingFields, slugify } from "@/lib/catalog/listing";
import { videoEmbedUrl } from "@/lib/catalog/video";
import { parseRupees } from "@/lib/format/money";
import type { FormState } from "@/components/admin/forms";

/*
 * Product edits from the admin. Each save rebuilds the listing fields (price range, discount, in
 * stock) and search words, then expires the storefront caches so the change shows straight away.
 */

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const lines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const optionalId = (value: string) => (value ? value : null);

/** Paragraphs separated by blank lines become the rich-text description. */
function descriptionFrom(value: string) {
  const paragraphs = value.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.replace(/\s+/g, " ").trim()).filter(Boolean);
  const escape = (input: string) => input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return {
    json: paragraphs.length ? { type: "doc", content: paragraphs.map((paragraph) => ({ type: "paragraph", content: [{ type: "text", text: paragraph }] })) } : null,
    html: paragraphs.length ? paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join("") : null,
  };
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base).slice(0, 80) || "product";
  for (let attempt = 0; attempt < 50; attempt++) {
    const slug = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const taken = await prisma.product.findFirst({ where: { storeId: DEFAULT_STORE_ID, slug, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
    if (!taken) return slug;
  }
  return `${root}-${randomBytes(3).toString("hex")}`;
}

async function uniqueSku(base: string): Promise<string> {
  const root = base.toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "SKU";
  for (let attempt = 0; attempt < 50; attempt++) {
    const sku = attempt === 0 ? root : `${root}-${attempt + 1}`;
    if (!(await prisma.productVariant.findFirst({ where: { storeId: DEFAULT_STORE_ID, sku }, select: { id: true } }))) return sku;
  }
  return `${root}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

/** Recomputes the listing fields and search words of a product from what is saved now. */
async function rebuildListing(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      brand: { select: { name: true } },
      variants: { select: { price: true, compareAtPrice: true, stockOnHand: true, isActive: true, title: true } },
      categories: { include: { category: { select: { path: true } } } },
      attributeValues: { include: { value: { select: { value: true } } } },
    },
  });
  const paths = product.categories.flatMap((entry) => entry.category.path.split("/").map((_, index, parts) => parts.slice(0, index + 1).join("/")));
  const categoryNames = paths.length
    ? (await prisma.category.findMany({ where: { storeId: DEFAULT_STORE_ID, path: { in: [...new Set(paths)] } }, select: { name: true } })).map((category) => category.name)
    : [];
  await prisma.product.update({
    where: { id: productId },
    data: {
      ...listingFields(product.variants),
      searchText: buildSearchText([
        product.title,
        product.brand?.name,
        ...categoryNames,
        ...product.attributeValues.map((entry) => entry.value?.value ?? (entry.numberValue !== null ? String(entry.numberValue) : null)),
        ...product.variants.map((variant) => (variant.title === "Default" ? null : variant.title)),
      ]),
    },
  });
  return product;
}

function refreshProduct(...slugs: string[]) {
  refreshStorefront("products", "brands", ...slugs.map((slug) => `product:${slug}` as const));
}

async function findProduct(id: string) {
  return prisma.product.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, select: { id: true, slug: true, title: true, status: true, primaryCategoryId: true } });
}

// ─── Create ────────────────────────────────────────────────────────────────────

const priceField = (label: string, required: boolean) =>
  z.string().transform((value, context) => {
    if (!value.trim()) {
      if (required) context.addIssue({ code: "custom", message: `Enter the ${label}.` });
      return null;
    }
    const paise = parseRupees(value);
    if (paise === null || paise <= 0 || paise > 100_000_000) {
      context.addIssue({ code: "custom", message: `The ${label} must be an amount in rupees, like 2499.` });
      return null;
    }
    return paise;
  });

const createSchema = z.object({
  title: z.string().trim().min(3, "Give the product a name of at least 3 letters.").max(140),
  primaryCategoryId: z.string().min(1, "Choose the category the product belongs to."),
  brandId: z.string(),
  kind: z.enum(["single", "sizes"]),
  price: priceField("price", true),
  compareAtPrice: priceField("original price", false),
  stock: z.coerce.number().int("Stock must be a whole number.").min(0, "Stock cannot be negative.").max(100_000),
  sizes: z.array(z.string()),
});

export async function createProduct(_state: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("catalogue.manage");
  const parsed = createSchema.safeParse({
    title: text(formData, "title"),
    primaryCategoryId: text(formData, "primaryCategoryId"),
    brandId: text(formData, "brandId"),
    kind: text(formData, "kind") || "single",
    price: text(formData, "price"),
    compareAtPrice: text(formData, "compareAtPrice"),
    stock: text(formData, "stock") || "0",
    sizes: formData.getAll("sizes").map(String),
  });
  if (!parsed.success) return { status: "error", message: "Please fix the following:", errors: parsed.error.issues.map((issue) => issue.message) };
  const input = parsed.data;
  if (input.compareAtPrice !== null && input.price !== null && input.compareAtPrice <= input.price) {
    return { status: "error", message: "The original price must be higher than the selling price, or left empty." };
  }

  let sizeOption: { attributeId: string; values: { id: string; value: string }[] } | null = null;
  if (input.kind === "sizes") {
    const attribute = await prisma.attribute.findFirst({ where: { storeId: DEFAULT_STORE_ID, code: "size_uk" }, include: { values: { orderBy: { sortKey: "asc" } } } });
    const chosen = attribute?.values.filter((value) => input.sizes.includes(value.id)) ?? [];
    if (!attribute || chosen.length === 0) return { status: "error", message: "Tick at least one UK size." };
    sizeOption = { attributeId: attribute.id, values: chosen.map((value) => ({ id: value.id, value: value.value })) };
  }

  const category = await prisma.category.findFirst({ where: { id: input.primaryCategoryId, storeId: DEFAULT_STORE_ID }, select: { id: true } });
  if (!category) return { status: "error", message: "That category no longer exists." };
  const brandId = input.brandId ? ((await prisma.brand.findFirst({ where: { id: input.brandId, storeId: DEFAULT_STORE_ID }, select: { id: true } }))?.id ?? null) : null;

  const slug = await uniqueSlug(input.title);
  const skuRoot = await uniqueSku(`MN-${slug.split("-").slice(0, 3).join("-")}`);
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        storeId: DEFAULT_STORE_ID,
        title: input.title,
        slug,
        status: "DRAFT",
        brandId,
        primaryCategoryId: category.id,
        categories: { create: { categoryId: category.id, position: 0 } },
      },
    });
    const option = sizeOption ? await tx.productOption.create({ data: { storeId: DEFAULT_STORE_ID, productId: created.id, attributeId: sizeOption.attributeId, position: 0 } }) : null;
    const variants = sizeOption ? sizeOption.values.map((value) => ({ title: value.value, sku: `${skuRoot}-${value.value.replace(/^UK /, "")}`, valueId: value.id })) : [{ title: "Default", sku: skuRoot, valueId: null }];
    for (const [position, variant] of variants.entries()) {
      await tx.productVariant.create({
        data: {
          storeId: DEFAULT_STORE_ID,
          productId: created.id,
          sku: variant.sku,
          title: variant.title,
          price: input.price!,
          compareAtPrice: input.compareAtPrice,
          stockOnHand: input.stock,
          position,
          options: option && variant.valueId ? { create: { optionId: option.id, valueId: variant.valueId } } : undefined,
          movements: input.stock > 0 ? { create: { storeId: DEFAULT_STORE_ID, delta: input.stock, balanceAfter: input.stock, reason: "STOCK_RECEIVED", note: "Opening stock" } } : undefined,
        },
      });
    }
    return created;
  });
  await rebuildListing(product.id);
  redirect(`/admin/products/${product.id}?created=1`);
}

// ─── Details ───────────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  title: z.string().trim().min(3, "The name needs at least 3 letters.").max(140),
  slug: z
    .string()
    .trim()
    .max(90)
    .transform((value) => slugify(value)),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  brandId: z.string(),
  primaryCategoryId: z.string().min(1, "Choose the main category."),
  categoryIds: z.array(z.string()),
  gender: z.enum(["", "MEN", "WOMEN", "UNISEX"]),
  summary: z.string().trim().max(300, "Keep the summary under 300 characters."),
  description: z.string().trim().max(8000),
  highlights: z.string().max(2000),
  specs: z.string().max(3000),
  care: z.string().trim().max(1000),
  warranty: z.string().trim().max(300),
  warrantyMonths: z.string().regex(/^\d{0,3}$/, "Warranty months must be a whole number."),
  badges: z.array(z.string().trim().max(24)).max(3, "Use at most three badges."),
  videoUrl: z.string().trim().max(300),
  isFeatured: z.boolean(),
});

export async function updateProductDetails(id: string, _state: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("catalogue.manage");
  const existing = await findProduct(id);
  if (!existing) return { status: "error", message: "This product no longer exists." };
  const parsed = detailsSchema.safeParse({
    title: text(formData, "title"),
    slug: text(formData, "slug") || text(formData, "title"),
    status: text(formData, "status"),
    brandId: text(formData, "brandId"),
    primaryCategoryId: text(formData, "primaryCategoryId"),
    categoryIds: formData.getAll("categoryIds").map(String),
    gender: text(formData, "gender"),
    summary: text(formData, "summary"),
    description: text(formData, "description"),
    highlights: text(formData, "highlights"),
    specs: text(formData, "specs"),
    care: text(formData, "care"),
    warranty: text(formData, "warranty"),
    warrantyMonths: text(formData, "warrantyMonths"),
    badges: [...new Set([...formData.getAll("badges").map(String), ...text(formData, "customBadge").split(",")].map((badge) => badge.trim()).filter(Boolean))],
    videoUrl: text(formData, "videoUrl"),
    isFeatured: formData.get("isFeatured") === "on",
  });
  if (!parsed.success) return { status: "error", message: "Please fix the following:", errors: parsed.error.issues.map((issue) => issue.message) };
  const input = parsed.data;

  if (input.videoUrl && !videoEmbedUrl(input.videoUrl)) return { status: "error", message: "The video link must be a YouTube or Vimeo address." };
  const specs: { label: string; value: string }[] = [];
  for (const line of lines(input.specs)) {
    const [label, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (!label?.trim() || !value) return { status: "error", message: `Write each spec as "Label: value". This line has no value: ${line}` };
    specs.push({ label: label.trim(), value });
  }
  const slug = input.slug || slugify(input.title);
  if (await prisma.product.findFirst({ where: { storeId: DEFAULT_STORE_ID, slug, id: { not: id } }, select: { id: true } })) {
    return { status: "error", message: `Another product already uses the address /product/${slug}. Choose a different one.` };
  }
  const categoryIds = [...new Set([input.primaryCategoryId, ...input.categoryIds])];
  const validCategories = await prisma.category.findMany({ where: { storeId: DEFAULT_STORE_ID, id: { in: categoryIds } }, select: { id: true } });
  if (!validCategories.some((category) => category.id === input.primaryCategoryId)) return { status: "error", message: "That main category no longer exists." };

  if (input.status === "ACTIVE") {
    const [photos, variants] = await Promise.all([
      prisma.productMedia.count({ where: { productId: id } }),
      prisma.productVariant.count({ where: { productId: id, isActive: true, price: { gt: 0 } } }),
    ]);
    const missing = [photos === 0 && "add at least one photo", variants === 0 && "give at least one size or option a price"].filter(Boolean);
    if (missing.length) return { status: "error", message: `Before this product can go on sale, ${missing.join(" and ")}.` };
  }

  const description = descriptionFrom(input.description);
  const keep = new Set(validCategories.map((category) => category.id));
  await prisma.$transaction(async (tx) => {
    await tx.categoryProduct.deleteMany({ where: { productId: id, categoryId: { notIn: [...keep] } } });
    for (const categoryId of keep) {
      await tx.categoryProduct.upsert({ where: { categoryId_productId: { categoryId, productId: id } }, create: { categoryId, productId: id }, update: {} });
    }
    await tx.product.update({
      where: { id },
      data: {
        title: input.title,
        slug,
        status: input.status,
        publishedAt: input.status === "ACTIVE" && existing.status !== "ACTIVE" ? new Date() : undefined,
        brandId: optionalId(input.brandId),
        primaryCategoryId: input.primaryCategoryId,
        gender: input.gender || null,
        summary: input.summary || null,
        description: description.json ?? Prisma.DbNull,
        descriptionHtml: description.html,
        highlights: lines(input.highlights).slice(0, 8),
        specs,
        care: input.care || null,
        warranty: input.warranty || null,
        warrantyMonths: input.warrantyMonths ? Number(input.warrantyMonths) : null,
        badges: input.badges,
        videoUrl: input.videoUrl || null,
        isFeatured: input.isFeatured,
        contentUpdatedAt: new Date(),
      },
    });
  });
  await rebuildListing(id);
  refreshProduct(existing.slug, slug);
  if (input.primaryCategoryId !== existing.primaryCategoryId) refreshStorefront("categories");
  return { status: "saved", message: input.status === "ACTIVE" ? "Saved. The product is on sale." : "Saved." };
}

// ─── Filters (attributes) ──────────────────────────────────────────────────────

export async function updateProductAttributes(id: string, _state: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("catalogue.manage");
  const product = await findProduct(id);
  if (!product) return { status: "error", message: "This product no longer exists." };
  const [attributes, options] = await Promise.all([
    attributesForCategory(product.primaryCategoryId),
    prisma.productOption.findMany({ where: { productId: id }, select: { attributeId: true } }),
  ]);
  const axes = new Set(options.map((option) => option.attributeId));
  const rows: Prisma.ProductAttributeValueCreateManyInput[] = [];
  for (const attribute of attributes) {
    if (axes.has(attribute.id)) continue;
    const name = `attr-${attribute.code}`;
    if (attribute.type === "NUMBER") {
      const raw = text(formData, name);
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) return { status: "error", message: `${attribute.name} must be a number.` };
      rows.push({ storeId: DEFAULT_STORE_ID, productId: id, attributeId: attribute.id, numberValue: value });
      continue;
    }
    const chosen = formData.getAll(name).map(String).filter(Boolean);
    for (const valueId of chosen) {
      if (!attribute.values.some((value) => value.id === valueId)) continue;
      rows.push({ storeId: DEFAULT_STORE_ID, productId: id, attributeId: attribute.id, valueId });
      if (attribute.type !== "MULTI_SELECT") break;
    }
  }
  await prisma.$transaction([
    prisma.productAttributeValue.deleteMany({ where: { productId: id, attributeId: { in: attributes.filter((attribute) => !axes.has(attribute.id)).map((attribute) => attribute.id) } } }),
    prisma.productAttributeValue.createMany({ data: rows }),
  ]);
  await rebuildListing(id);
  refreshProduct(product.slug);
  return { status: "saved", message: "Filters saved." };
}

// ─── Sizes, prices and stock ───────────────────────────────────────────────────

export async function updateVariants(id: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("catalogue.manage");
  const product = await findProduct(id);
  if (!product) return { status: "error", message: "This product no longer exists." };
  const variants = await prisma.productVariant.findMany({ where: { productId: id }, orderBy: { position: "asc" } });
  const errors: string[] = [];
  const updates: { id: string; data: Prisma.ProductVariantUpdateInput; stockDelta: number; balance: number }[] = [];
  for (const variant of variants) {
    const label = variant.title === "Default" ? "This product" : variant.title;
    const price = parseRupees(text(formData, `price-${variant.id}`));
    const compareRaw = text(formData, `compare-${variant.id}`);
    const compareAt = compareRaw ? parseRupees(compareRaw) : null;
    const stock = Number(text(formData, `stock-${variant.id}`));
    const sku = text(formData, `sku-${variant.id}`).toUpperCase();
    const isActive = formData.get(`active-${variant.id}`) === "on";
    if (price === null || price <= 0) errors.push(`${label}: enter a price in rupees.`);
    if (compareRaw && (compareAt === null || (price !== null && compareAt <= price))) errors.push(`${label}: the original price must be higher than the price, or empty.`);
    if (!Number.isInteger(stock) || stock < 0) errors.push(`${label}: stock must be a whole number, 0 or more.`);
    if (!/^[A-Z0-9][A-Z0-9-]{1,47}$/.test(sku)) errors.push(`${label}: the SKU can use letters, numbers and dashes.`);
    else if (sku !== variant.sku && (await prisma.productVariant.findFirst({ where: { storeId: DEFAULT_STORE_ID, sku, id: { not: variant.id } }, select: { id: true } }))) {
      errors.push(`${label}: the SKU ${sku} is already used by another product.`);
    }
    if (price !== null && Number.isInteger(stock)) {
      updates.push({ id: variant.id, data: { price, compareAtPrice: compareAt, stockOnHand: stock, sku, isActive }, stockDelta: stock - variant.stockOnHand, balance: stock });
    }
  }
  if (errors.length) return { status: "error", message: "Please fix the following:", errors };
  if (product.status === "ACTIVE" && !updates.some((update) => update.data.isActive)) {
    return { status: "error", message: "A product on sale needs at least one active size or option. Set the product to Draft first." };
  }
  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      await tx.productVariant.update({ where: { id: update.id }, data: update.data });
      if (update.stockDelta !== 0) {
        await tx.stockMovement.create({
          data: { storeId: DEFAULT_STORE_ID, variantId: update.id, delta: update.stockDelta, balanceAfter: update.balance, reason: "MANUAL_ADJUSTMENT", staffId: user.id },
        });
      }
    }
  });
  await rebuildListing(id);
  refreshProduct(product.slug);
  return { status: "saved", message: "Prices and stock saved." };
}

/** Adds UK sizes to a sized product, copying the price of the existing sizes. */
export async function addSizes(id: string, _state: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("catalogue.manage");
  const product = await findProduct(id);
  if (!product) return { status: "error", message: "This product no longer exists." };
  const option = await prisma.productOption.findFirst({ where: { productId: id, attribute: { code: "size_uk" } }, include: { attribute: { include: { values: true } } } });
  if (!option) return { status: "error", message: "This product is not sold in sizes." };
  const variants = await prisma.productVariant.findMany({ where: { productId: id }, orderBy: { position: "asc" }, include: { options: true } });
  const have = new Set(variants.flatMap((variant) => variant.options.map((entry) => entry.valueId)));
  const chosen = option.attribute.values.filter((value) => formData.getAll("sizes").map(String).includes(value.id) && !have.has(value.id));
  if (chosen.length === 0) return { status: "error", message: "Tick a size the product does not have yet." };
  if (variants.some((variant) => variant.options.length !== 1)) return { status: "error", message: "This product varies by more than size; add sizes from the demo seed or ask for help." };
  const template = variants[0];
  const stock = Math.max(0, Number(text(formData, "stock")) || 0);
  const skuRoot = template ? template.sku.replace(/-[^-]+$/, "") : `MN-${product.slug.toUpperCase()}`;
  let position = variants.length;
  for (const value of chosen.sort((a, b) => (a.sortKey ?? 0) - (b.sortKey ?? 0))) {
    await prisma.productVariant.create({
      data: {
        storeId: DEFAULT_STORE_ID,
        productId: id,
        sku: await uniqueSku(`${skuRoot}-${value.value.replace(/^UK /, "")}`),
        title: value.value,
        price: template?.price ?? 0,
        compareAtPrice: template?.compareAtPrice ?? null,
        stockOnHand: stock,
        position: position++,
        options: { create: { optionId: option.id, valueId: value.id } },
        movements: stock > 0 ? { create: { storeId: DEFAULT_STORE_ID, delta: stock, balanceAfter: stock, reason: "STOCK_RECEIVED" } } : undefined,
      },
    });
  }
  // Keep sizes in size order.
  const all = await prisma.productVariant.findMany({ where: { productId: id }, include: { options: { include: { value: true } } } });
  all.sort((a, b) => (a.options[0]?.value.sortKey ?? 0) - (b.options[0]?.value.sortKey ?? 0));
  await prisma.$transaction(all.map((variant, index) => prisma.productVariant.update({ where: { id: variant.id }, data: { position: index } })));
  await rebuildListing(id);
  refreshProduct(product.slug);
  return { status: "saved", message: `Added ${chosen.map((value) => value.value).join(", ")}.` };
}

// ─── Search engines ────────────────────────────────────────────────────────────

export async function updateProductSeo(id: string, _state: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("catalogue.manage");
  const product = await findProduct(id);
  if (!product) return { status: "error", message: "This product no longer exists." };
  const metaTitle = text(formData, "metaTitle");
  const metaDescription = text(formData, "metaDescription");
  if (metaTitle.length > 70) return { status: "error", message: "Keep the page title to 70 characters or fewer; Google cuts longer ones." };
  if (metaDescription.length > 170) return { status: "error", message: "Keep the description to 170 characters or fewer." };
  await prisma.product.update({ where: { id }, data: { metaTitle: metaTitle || null, metaDescription: metaDescription || null, noindex: formData.get("noindex") === "on" } });
  refreshProduct(product.slug);
  return { status: "saved", message: "Saved." };
}

// ─── Photos ────────────────────────────────────────────────────────────────────

const idList = z.array(z.string().min(1)).max(60);

export async function reorderProductMedia(id: string, orderedIds: string[]) {
  await requireStaff("catalogue.manage");
  const product = await findProduct(id);
  const ids = idList.safeParse(orderedIds);
  if (!product || !ids.success) return { ok: false };
  const owned = await prisma.productMedia.findMany({ where: { productId: id, id: { in: ids.data } }, select: { id: true } });
  if (owned.length !== ids.data.length) return { ok: false };
  await prisma.$transaction(ids.data.map((entryId, position) => prisma.productMedia.update({ where: { id: entryId }, data: { position } })));
  refreshProduct(product.slug);
  return { ok: true };
}

export async function updateMediaAlt(id: string, productMediaId: string, alt: string) {
  await requireStaff("catalogue.manage");
  const product = await findProduct(id);
  const entry = await prisma.productMedia.findFirst({ where: { id: productMediaId, productId: id }, select: { mediaId: true } });
  const value = alt.trim().slice(0, 200);
  if (!product || !entry) return { ok: false, message: "This photo is no longer on the product." };
  if (value.length < 3) return { ok: false, message: "Describe the photo in a few words, for shoppers using screen readers." };
  await prisma.media.update({ where: { id: entry.mediaId }, data: { alt: value } });
  refreshProduct(product.slug);
  return { ok: true, message: "Saved." };
}

export async function removeProductMedia(id: string, productMediaId: string) {
  await requireStaff("catalogue.manage");
  const product = await findProduct(id);
  const entry = await prisma.productMedia.findFirst({ where: { id: productMediaId, productId: id } });
  if (!product || !entry) return { ok: false, message: "This photo is no longer on the product." };
  const remaining = await prisma.productMedia.count({ where: { productId: id } });
  if (product.status === "ACTIVE" && remaining <= 1) return { ok: false, message: "A product on sale needs at least one photo. Upload another first." };
  await prisma.productMedia.delete({ where: { id: entry.id } });
  // The file itself stays in the library; other products or banners may use it.
  refreshProduct(product.slug);
  return { ok: true };
}

// ─── Duplicate and delete ──────────────────────────────────────────────────────

/** Copies a product as a draft with new SKUs and no stock, then opens the copy. */
export async function duplicateProduct(id: string) {
  await requireStaff("catalogue.manage");
  const source = await prisma.product.findFirst({
    where: { id, storeId: DEFAULT_STORE_ID },
    include: { categories: true, media: true, options: true, attributeValues: true, variants: { include: { options: true } } },
  });
  if (!source) return { ok: false, message: "This product no longer exists." };
  const title = `${source.title} (copy)`;
  const slug = await uniqueSlug(title);
  const copy = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        storeId: DEFAULT_STORE_ID,
        title,
        slug,
        status: "DRAFT",
        brandId: source.brandId,
        primaryCategoryId: source.primaryCategoryId,
        gender: source.gender,
        summary: source.summary,
        description: source.description ?? undefined,
        descriptionHtml: source.descriptionHtml,
        highlights: source.highlights ?? undefined,
        specs: source.specs ?? undefined,
        care: source.care,
        warranty: source.warranty,
        warrantyMonths: source.warrantyMonths,
        taxClassId: source.taxClassId,
        hsnCode: source.hsnCode,
        sizeChartId: source.sizeChartId,
        videoUrl: source.videoUrl,
        badges: source.badges ?? undefined,
        isPlaceholderPhoto: source.isPlaceholderPhoto,
        categories: { create: source.categories.map((entry) => ({ categoryId: entry.categoryId, position: entry.position })) },
        media: { create: source.media.map((entry) => ({ storeId: DEFAULT_STORE_ID, mediaId: entry.mediaId, role: entry.role, position: entry.position, optionValueId: entry.optionValueId })) },
        attributeValues: {
          create: source.attributeValues.map((entry) => ({ storeId: DEFAULT_STORE_ID, attributeId: entry.attributeId, valueId: entry.valueId, numberValue: entry.numberValue, textValue: entry.textValue })),
        },
      },
    });
    const optionIds = new Map<string, string>();
    for (const option of source.options) {
      optionIds.set(option.id, (await tx.productOption.create({ data: { storeId: DEFAULT_STORE_ID, productId: created.id, attributeId: option.attributeId, position: option.position } })).id);
    }
    const suffix = randomBytes(2).toString("hex").toUpperCase();
    for (const variant of source.variants) {
      await tx.productVariant.create({
        data: {
          storeId: DEFAULT_STORE_ID,
          productId: created.id,
          sku: `${variant.sku}-${suffix}`.slice(0, 48),
          title: variant.title,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          stockOnHand: 0,
          position: variant.position,
          isActive: variant.isActive,
          weightGrams: variant.weightGrams,
          lengthCm: variant.lengthCm,
          breadthCm: variant.breadthCm,
          heightCm: variant.heightCm,
          options: { create: variant.options.map((entry) => ({ optionId: optionIds.get(entry.optionId)!, valueId: entry.valueId })) },
        },
      });
    }
    return created;
  });
  await rebuildListing(copy.id);
  redirect(`/admin/products/${copy.id}?duplicated=1`);
}

/**
 * Deletes a product that was never ordered. A product with orders is archived instead, so its
 * orders, invoices and reviews keep pointing at it.
 */
export async function deleteProduct(id: string) {
  await requireStaff("catalogue.manage");
  const product = await prisma.product.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, select: { id: true, slug: true, _count: { select: { orderItems: true } } } });
  if (!product) redirect("/admin/products");
  if (product._count.orderItems > 0) {
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  } else {
    // Variants, photos links, cart and wishlist entries and reviews go with it (cascade).
    await prisma.product.delete({ where: { id } });
  }
  refreshProduct(product.slug);
  redirect(`/admin/products?${product._count.orderItems > 0 ? "archived" : "deleted"}=1`);
}
