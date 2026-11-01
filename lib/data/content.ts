import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";
import { mediaUrl } from "@/lib/media/url";

const faqSchema = z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) }));

// ─── Pages (policies, about, contact, FAQ) ──────────────────────────────────

async function loadPage(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.content);
  const page = await prisma.page.findUnique({ where: { storeId_slug: { storeId: DEFAULT_STORE_ID, slug } } });
  if (!page || page.status !== "PUBLISHED") return null;
  return {
    slug: page.slug,
    kind: page.kind,
    title: page.title,
    html: page.contentHtml ?? "",
    faqs: faqSchema.catch([]).parse(page.faqs ?? []),
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    updatedAt: page.contentUpdatedAt,
  };
}

export type ContentPage = NonNullable<Awaited<ReturnType<typeof loadPage>>>;

export async function getPage(slug: string): Promise<ContentPage | null> {
  await connection();
  return loadPage(slug);
}

async function loadPolicyLinks() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.content);
  return prisma.page.findMany({
    where: { storeId: DEFAULT_STORE_ID, kind: "POLICY", status: "PUBLISHED" },
    orderBy: { title: "asc" },
    select: { slug: true, title: true },
  });
}

export async function getPolicyLinks() {
  await connection();
  return loadPolicyLinks();
}

// ─── Journal ────────────────────────────────────────────────────────────────

const coverOf = (cover: { key: string | null; alt: string | null; width: number | null; height: number | null; blurDataUrl: string | null } | null, fallbackAlt: string) =>
  cover?.key ? { url: mediaUrl(cover.key), alt: cover.alt ?? fallbackAlt, blurDataUrl: cover.blurDataUrl } : null;

async function loadPosts() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.content);
  const posts = await prisma.post.findMany({
    where: { storeId: DEFAULT_STORE_ID, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { cover: true, author: { select: { name: true } } },
  });
  return posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    readingMinutes: post.readingMinutes,
    author: post.author.name,
    cover: coverOf(post.cover, post.title),
  }));
}

export type PostSummary = Awaited<ReturnType<typeof loadPosts>>[number];

export async function getPosts(): Promise<PostSummary[]> {
  await connection();
  return loadPosts();
}

async function loadPost(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.content);
  const post = await prisma.post.findUnique({
    where: { storeId_slug: { storeId: DEFAULT_STORE_ID, slug } },
    include: { cover: true, author: { select: { name: true, jobTitle: true } } },
  });
  if (!post || post.status !== "PUBLISHED") return null;
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    html: post.contentHtml ?? "",
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    readingMinutes: post.readingMinutes,
    author: post.author.name,
    authorRole: post.author.jobTitle,
    cover: coverOf(post.cover, post.title),
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
  };
}

export async function getPost(slug: string) {
  await connection();
  return loadPost(slug);
}

// ─── Brands ─────────────────────────────────────────────────────────────────

async function loadBrands() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.brands, tags.products);
  const brands = await prisma.brand.findMany({
    where: { storeId: DEFAULT_STORE_ID, isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  });
  return brands
    .filter((brand) => brand._count.products > 0)
    .map((brand) => ({
      slug: brand.slug,
      name: brand.name,
      intro: brand.intro,
      country: brand.countryOfOrigin,
      featured: brand.isFeatured,
      productCount: brand._count.products,
      metaTitle: brand.metaTitle,
      metaDescription: brand.metaDescription,
    }));
}

export type BrandSummary = Awaited<ReturnType<typeof loadBrands>>[number];

/** Active brands with at least one product on sale, in the owner's order. */
export async function getBrands(): Promise<BrandSummary[]> {
  await connection();
  return loadBrands();
}
