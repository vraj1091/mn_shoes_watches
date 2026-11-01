import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";
import { mediaUrl } from "@/lib/media/url";

async function loadHeroBanners(now: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.banners);
  const at = new Date(now);
  const banners = await prisma.banner.findMany({
    where: {
      storeId: DEFAULT_STORE_ID,
      placement: "HOME_HERO",
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: at } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: at } }] }],
    },
    orderBy: { position: "asc" },
    include: { desktopImage: true, mobileImage: true },
  });
  return banners.map((banner) => {
    const image = banner.desktopImage;
    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      ctaLabel: banner.ctaLabel,
      ctaHref: banner.ctaHref,
      image: image?.key ? { url: mediaUrl(image.key), alt: image.alt ?? "", blurDataUrl: image.blurDataUrl } : null,
    };
  });
}

export type HeroBanner = Awaited<ReturnType<typeof loadHeroBanners>>[number];

/** Live hero banners in the owner's order (start and end dates respected, checked hourly). */
export async function getHeroBanners(): Promise<HeroBanner[]> {
  await connection();
  // Rounded to the hour so the cache key changes at most hourly.
  return loadHeroBanners(Math.floor(Date.now() / 3_600_000) * 3_600_000);
}
