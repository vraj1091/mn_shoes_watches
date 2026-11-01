import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";

async function loadReviews(productId: string) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.reviews);
  const reviews = await prisma.review.findMany({
    where: { storeId: DEFAULT_STORE_ID, productId, status: "APPROVED" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: { id: true, authorName: true, authorCity: true, rating: true, title: true, body: true, isVerifiedBuyer: true, publishedAt: true, reply: true },
  });
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((review) => review.rating === stars).length }));
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return { reviews, distribution, average, count: reviews.length };
}

export type ProductReviews = Awaited<ReturnType<typeof loadReviews>>;

export async function getProductReviews(productId: string): Promise<ProductReviews> {
  await connection();
  return loadReviews(productId);
}

async function loadFeaturedReviews() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.reviews, tags.products);
  return prisma.review.findMany({
    where: { storeId: DEFAULT_STORE_ID, status: "APPROVED", rating: { gte: 4 }, product: { status: "ACTIVE" } },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: 3,
    select: { id: true, authorName: true, rating: true, body: true, product: { select: { title: true, slug: true } } },
  });
}

/** Good recent reviews for the home page, the owner's featured ones first. */
export async function getFeaturedReviews() {
  await connection();
  return loadFeaturedReviews();
}
