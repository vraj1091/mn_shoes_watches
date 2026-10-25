/**
 * Cache tag names. Data functions tag what they read; admin saves expire the same tags, so a
 * page shows the owner's change on the next request.
 */
export const tags = {
  settings: "settings",
  locations: "locations",
  categories: "categories",
  collections: "collections",
  menus: "menus",
  products: "products",
  product: (slug: string) => `product:${slug}`,
  synonyms: "synonyms",
  brands: "brands",
  banners: "banners",
  content: "content", // pages and Journal posts
  reviews: "reviews",
  discounts: "discounts",
  shipping: "shipping",
} as const;

/** Every fixed tag, for "expire everything" after a demo reset or a bulk import. */
export const ALL_TAGS: string[] = Object.values(tags).flatMap((tag) => (typeof tag === "string" ? [tag] : []));
