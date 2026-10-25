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
} as const;
