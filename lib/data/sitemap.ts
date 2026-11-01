import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";
import { mediaUrl } from "@/lib/media/url";

export type SitemapEntry = { path: string; updatedAt: Date; images?: string[] };

/** Pages served at a fixed address by slug; policies live under /policies, other pages have no public URL. */
const FIXED_PAGES = new Set(["about", "contact", "faq"]);

/**
 * Every page a search engine should know about: live, and not marked "hide from search" by the
 * owner. Same rules as the pages themselves: active products and categories, brands with at least
 * one active product, active collections at their landing address when they have one, published
 * pages and Journal posts. Nothing listed here redirects or 404s.
 */
async function loadSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.products, tags.categories, tags.brands, tags.collections, tags.content);
  const store = { storeId: DEFAULT_STORE_ID, noindex: false };
  const [products, categories, brands, collections, pages, posts] = await Promise.all([
    prisma.product.findMany({
      where: { ...store, status: "ACTIVE" },
      orderBy: { slug: "asc" },
      select: {
        slug: true,
        contentUpdatedAt: true,
        media: { where: { role: "GALLERY", media: { kind: "IMAGE" } }, orderBy: { position: "asc" }, take: 4, select: { media: { select: { key: true } } } },
      },
    }),
    prisma.category.findMany({ where: { ...store, isActive: true }, orderBy: { path: "asc" }, select: { path: true, contentUpdatedAt: true } }),
    prisma.brand.findMany({
      where: { ...store, isActive: true, products: { some: { status: "ACTIVE" } } },
      orderBy: { slug: "asc" },
      select: { slug: true, contentUpdatedAt: true },
    }),
    prisma.collection.findMany({ where: { ...store, isActive: true }, orderBy: { slug: "asc" }, select: { slug: true, landingPath: true, contentUpdatedAt: true } }),
    prisma.page.findMany({ where: { ...store, status: "PUBLISHED" }, orderBy: { slug: "asc" }, select: { slug: true, kind: true, contentUpdatedAt: true } }),
    prisma.post.findMany({ where: { ...store, status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: { slug: true, contentUpdatedAt: true } }),
  ]);

  const latest = (dates: Date[]) => new Date(Math.max(0, ...dates.map((date) => date.getTime())));
  const productsUpdated = latest(products.map((product) => product.contentUpdatedAt));
  return [
    { path: "/", updatedAt: productsUpdated },
    ...categories.map((category) => ({ path: `/${category.path}`, updatedAt: category.contentUpdatedAt })),
    ...products.map((product) => ({
      path: `/product/${product.slug}`,
      updatedAt: product.contentUpdatedAt,
      images: product.media.flatMap((entry) => (entry.media.key ? [mediaUrl(entry.media.key)] : [])),
    })),
    { path: "/brands", updatedAt: latest(brands.map((brand) => brand.contentUpdatedAt)) },
    ...brands.map((brand) => ({ path: `/brands/${brand.slug}`, updatedAt: brand.contentUpdatedAt })),
    ...collections.map((collection) => ({ path: collection.landingPath ? `/${collection.landingPath}` : `/collections/${collection.slug}`, updatedAt: collection.contentUpdatedAt })),
    { path: "/sale", updatedAt: productsUpdated },
    ...(posts.length > 0 ? [{ path: "/journal", updatedAt: latest(posts.map((post) => post.contentUpdatedAt)) }] : []),
    ...posts.map((post) => ({ path: `/journal/${post.slug}`, updatedAt: post.contentUpdatedAt })),
    ...pages.flatMap((page) =>
      page.kind === "POLICY" ? [{ path: `/policies/${page.slug}`, updatedAt: page.contentUpdatedAt }] : FIXED_PAGES.has(page.slug) ? [{ path: `/${page.slug}`, updatedAt: page.contentUpdatedAt }] : [],
    ),
  ];
}

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  await connection();
  return loadSitemapEntries();
}
