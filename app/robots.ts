import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { env } from "@/lib/env";

/*
 * Part 6: private and thin pages stay out of search engines; everything else, including AI
 * search crawlers, may crawl, and the sitemap lists what is worth crawling. A demo or test copy
 * (HIDE_FROM_SEARCH=true) turns every crawler away. Read at request time, so the address and the
 * switch come from the server's settings, not the build machine's.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const { APP_URL, HIDE_FROM_SEARCH } = env();
  if (HIDE_FROM_SEARCH === "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/account", "/cart", "/checkout", "/wishlist", "/order", "/search"],
      },
    ],
    sitemap: new URL("/sitemap.xml", APP_URL).toString(),
  };
}
