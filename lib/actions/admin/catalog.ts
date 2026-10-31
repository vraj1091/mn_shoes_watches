"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { requireStaff } from "@/lib/auth/session";
import { audit, diff } from "@/lib/admin/audit";
import { refreshStorefront } from "@/lib/admin/refresh";
import { slugify } from "@/lib/catalog/listing";
import type { FormState } from "@/components/admin/forms";

/* Categories and brands. Category and brand pages, menus and filters all read these, so every save
   expires the catalogue caches. */

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const issues = (error: z.ZodError): FormState => ({ status: "error", message: "Please fix the following:", errors: error.issues.map((issue) => issue.message) });

function refreshCatalogue() {
  refreshStorefront("categories", "products", "menus", "collections", "brands");
}

// ─── Categories ────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(2, "The name needs at least 2 letters.").max(60),
  intro: z.string().trim().max(1200, "Keep the intro under 1,200 characters."),
  metaTitle: z.string().trim().max(70, "Keep the page title to 70 characters."),
  metaDescription: z.string().trim().max(170, "Keep the description to 170 characters."),
  isActive: z.boolean(),
  showInMenu: z.boolean(),
});

export async function updateCategory(id: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("catalogue.manage");
  const parsed = categorySchema.safeParse({
    name: text(formData, "name"),
    intro: text(formData, "intro"),
    metaTitle: text(formData, "metaTitle"),
    metaDescription: text(formData, "metaDescription"),
    isActive: formData.get("isActive") === "on",
    showInMenu: formData.get("showInMenu") === "on",
  });
  if (!parsed.success) return issues(parsed.error);
  const category = await prisma.category.findFirst({
    where: { id, storeId: DEFAULT_STORE_ID },
    select: { id: true, parentId: true, name: true, isActive: true, showInMenu: true, intro: true, metaTitle: true, metaDescription: true },
  });
  if (!category) return { status: "error", message: "This category no longer exists." };
  if (!parsed.data.isActive && category.parentId === null) {
    const others = await prisma.category.count({ where: { storeId: DEFAULT_STORE_ID, parentId: null, isActive: true, id: { not: id } } });
    if (others === 0) return { status: "error", message: "The shop needs at least one active main category." };
  }
  const { metaTitle, metaDescription, intro, ...rest } = parsed.data;
  const data = { ...rest, intro: intro || null, metaTitle: metaTitle || null, metaDescription: metaDescription || null };
  await prisma.category.update({ where: { id }, data: { ...data, contentUpdatedAt: new Date() } });
  await audit(user.id, "category.update", { type: "category", id }, `Changed category “${data.name}”.`, diff(category, data));
  refreshCatalogue();
  return { status: "saved", message: parsed.data.isActive ? "Saved." : "Saved. The category is hidden from the shop." };
}

/** Adds a subcategory. It gets the parent's filters; tax and size chart come from the parent. */
export async function addCategory(parentId: string | null, _state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("catalogue.manage");
  const name = text(formData, "name");
  if (name.length < 2 || name.length > 60) return { status: "error", message: "Give the category a name of 2 to 60 characters." };
  const slug = slugify(text(formData, "slug") || name).slice(0, 60);
  if (!slug) return { status: "error", message: "The web address needs letters or numbers." };
  const parent = parentId ? await prisma.category.findFirst({ where: { id: parentId, storeId: DEFAULT_STORE_ID }, include: { filters: true } }) : null;
  if (parentId && !parent) return { status: "error", message: "The parent category no longer exists." };
  if (parent && parent.depth >= 2) return { status: "error", message: "Categories go three levels deep at most." };
  const path = parent ? `${parent.path}/${slug}` : slug;
  if (await prisma.category.findFirst({ where: { storeId: DEFAULT_STORE_ID, path }, select: { id: true } })) {
    return { status: "error", message: `/${path} is already a category. Choose a different name or web address.` };
  }
  const last = await prisma.category.aggregate({ where: { storeId: DEFAULT_STORE_ID, parentId }, _max: { position: true } });
  const created = await prisma.category.create({
    data: {
      storeId: DEFAULT_STORE_ID,
      parentId,
      name,
      slug,
      path,
      depth: parent ? parent.depth + 1 : 0,
      position: (last._max.position ?? -1) + 1,
      showInMenu: true,
      filters: parent ? { create: parent.filters.map((filter) => ({ attributeId: filter.attributeId, position: filter.position })) } : undefined,
    },
  });
  await audit(user.id, "category.create", { type: "category", id: created.id }, `Added category “${name}” at /${path}.`);
  refreshCatalogue();
  return { status: "saved", message: `Added ${name} at /${path}.` };
}

/** Moves a category one place up or down among its siblings (menu and grid order). */
export async function moveCategory(id: string, direction: -1 | 1) {
  const { user } = await requireStaff("catalogue.manage");
  const category = await prisma.category.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, select: { parentId: true, name: true } });
  if (!category) return { ok: false };
  const siblings = await prisma.category.findMany({ where: { storeId: DEFAULT_STORE_ID, parentId: category.parentId }, orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true } });
  const index = siblings.findIndex((sibling) => sibling.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= siblings.length) return { ok: false };
  [siblings[index], siblings[target]] = [siblings[target]!, siblings[index]!];
  await prisma.$transaction(siblings.map((sibling, position) => prisma.category.update({ where: { id: sibling.id }, data: { position } })));
  await audit(user.id, "category.reorder", { type: "category", id }, `Moved “${category.name}” ${direction < 0 ? "up" : "down"} in the menu.`);
  refreshCatalogue();
  return { ok: true };
}

/** Deletes an empty category; one with products or subcategories can only be hidden. */
export async function deleteCategory(id: string) {
  const { user } = await requireStaff("catalogue.manage");
  const category = await prisma.category.findFirst({
    where: { id, storeId: DEFAULT_STORE_ID },
    select: { name: true, _count: { select: { children: true, products: true, primaryProducts: true } } },
  });
  if (!category) redirect("/admin/categories");
  if (category._count.children + category._count.products + category._count.primaryProducts > 0) {
    return { ok: false, message: `${category.name} still has products or subcategories. Move them first, or untick “Show in the shop” to hide it.` };
  }
  await prisma.category.delete({ where: { id } });
  await audit(user.id, "category.delete", { type: "category", id }, `Deleted category “${category.name}”.`);
  refreshCatalogue();
  redirect("/admin/categories?deleted=1");
}

// ─── Brands ────────────────────────────────────────────────────────────────────

const brandSchema = z.object({
  name: z.string().trim().min(1, "Enter the brand name.").max(60),
  slug: z.string().trim().max(60),
  intro: z.string().trim().max(800, "Keep the intro under 800 characters."),
  countryOfOrigin: z.string().trim().max(60),
  website: z.union([z.literal(""), z.url({ protocol: /^https?$/, message: "The website must start with https://." })]),
  metaTitle: z.string().trim().max(70, "Keep the page title to 70 characters."),
  metaDescription: z.string().trim().max(170, "Keep the description to 170 characters."),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

function brandInput(formData: FormData) {
  return brandSchema.safeParse({
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    intro: text(formData, "intro"),
    countryOfOrigin: text(formData, "countryOfOrigin"),
    website: text(formData, "website"),
    metaTitle: text(formData, "metaTitle"),
    metaDescription: text(formData, "metaDescription"),
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  });
}

export async function saveBrand(id: string | null, _state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("catalogue.manage");
  const parsed = brandInput(formData);
  if (!parsed.success) return issues(parsed.error);
  const { slug: rawSlug, intro, countryOfOrigin, website, metaTitle, metaDescription, ...rest } = parsed.data;
  const slug = slugify(rawSlug || rest.name).slice(0, 60);
  if (!slug) return { status: "error", message: "The web address needs letters or numbers." };
  const clash = await prisma.brand.findFirst({ where: { storeId: DEFAULT_STORE_ID, slug, ...(id ? { id: { not: id } } : {}) }, select: { name: true } });
  if (clash) return { status: "error", message: `${clash.name} already uses /brands/${slug}.` };
  const data = {
    ...rest,
    slug,
    intro: intro || null,
    countryOfOrigin: countryOfOrigin || null,
    website: website || null,
    metaTitle: metaTitle || null,
    metaDescription: metaDescription || null,
    contentUpdatedAt: new Date(),
  };
  if (id) {
    const existing = await prisma.brand.findFirst({ where: { id, storeId: DEFAULT_STORE_ID } });
    if (!existing) return { status: "error", message: "This brand no longer exists." };
    await prisma.brand.update({ where: { id }, data });
    // contentUpdatedAt changes on every save; only the fields the owner edited are logged.
    await audit(user.id, "brand.update", { type: "brand", id }, `Changed brand “${data.name}”.`, diff(existing, { ...data, contentUpdatedAt: existing.contentUpdatedAt }));
    refreshCatalogue();
    return { status: "saved", message: "Saved." };
  }
  const created = await prisma.brand.create({ data: { storeId: DEFAULT_STORE_ID, ...data } });
  await audit(user.id, "brand.create", { type: "brand", id: created.id }, `Added brand “${data.name}”.`);
  refreshCatalogue();
  redirect(`/admin/brands/${created.id}?created=1`);
}

/** Deletes a brand with no products; products keep selling without a brand otherwise. */
export async function deleteBrand(id: string) {
  const { user } = await requireStaff("catalogue.manage");
  const brand = await prisma.brand.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, select: { name: true, _count: { select: { products: true } } } });
  if (!brand) redirect("/admin/brands");
  if (brand._count.products > 0) {
    return { ok: false, message: `${brand.name} is on ${brand._count.products} products. Give them another brand first, or untick “Show in the shop”.` };
  }
  await prisma.brand.delete({ where: { id } });
  await audit(user.id, "brand.delete", { type: "brand", id }, `Deleted brand “${brand.name}”.`);
  refreshCatalogue();
  redirect("/admin/brands?deleted=1");
}
