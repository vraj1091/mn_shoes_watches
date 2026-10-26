import "server-only";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { mediaUrl } from "@/lib/media/url";
import type { PickableImage } from "@/components/admin/image-picker";

/** The main photo of each product on sale, for reuse as a banner image. */
export async function productPhotoLibrary(): Promise<PickableImage[]> {
  const products = await prisma.product.findMany({
    where: { storeId: DEFAULT_STORE_ID, status: "ACTIVE", isPlaceholderPhoto: false },
    orderBy: { bestsellerScore: "desc" },
    take: 80,
    select: { media: { where: { role: "GALLERY" }, orderBy: { position: "asc" }, take: 1, select: { media: { select: { id: true, key: true, alt: true } } } } },
  });
  return products.flatMap((product) => {
    const media = product.media[0]?.media;
    return media?.key ? [{ id: media.id, url: mediaUrl(media.key), alt: media.alt ?? "" }] : [];
  });
}

/** Live, scheduled, ended or switched off, from the dates and the switch. */
export function bannerState(banner: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (!banner.isActive) return { label: "Off", tone: "neutral" as const };
  if (banner.startsAt && banner.startsAt > now) return { label: "Scheduled", tone: "info" as const };
  if (banner.endsAt && banner.endsAt <= now) return { label: "Ended", tone: "bad" as const };
  return { label: "Live", tone: "good" as const };
}
