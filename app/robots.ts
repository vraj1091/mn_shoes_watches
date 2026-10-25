import type { MetadataRoute } from "next";

/*
 * Part 6: private and thin pages stay out of search engines; everything else, including AI
 * search crawlers, may crawl. Phase 5 makes the crawler list editable in Settings and adds the
 * sitemap index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/account", "/cart", "/checkout", "/wishlist", "/order", "/search"],
      },
    ],
  };
}
