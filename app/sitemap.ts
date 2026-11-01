import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/data/sitemap";
import { env } from "@/lib/env";

/** /sitemap.xml: every live, indexable page, with product photos as image entries. Built at request time from cached data. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();
  const base = env().APP_URL;
  return entries.map((entry) => ({
    url: new URL(entry.path, base).toString(),
    lastModified: entry.updatedAt,
    ...(entry.images?.length ? { images: entry.images.map((image) => new URL(image, base).toString()) } : {}),
  }));
}
