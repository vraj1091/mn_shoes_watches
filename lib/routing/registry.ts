import Database from "better-sqlite3";
import { databaseFile } from "@/lib/db/paths";
import type { NotFoundData } from "./not-found-html";

/*
 * Which shop URLs exist, for proxy.ts. Pages stream, and once streaming starts the status code is
 * fixed at 200, so an unknown category or product would otherwise get a "soft 404". The proxy runs
 * before rendering and can still answer a real 404 or 301 (DECISIONS.md 37).
 * Note: "isActive" = 1 works because SQLite stores Prisma booleans as integers.
 *
 * Read straight from SQLite with a read-only connection (the proxy cannot use Prisma's server
 * modules). PRAGMA data_version changes whenever another connection commits, so the lists reload
 * after an admin edit and cost one tiny query per request otherwise.
 */

export type ProductRoute = { status: string; replacement: string | null };

type Registry = {
  version: number;
  categories: Set<string>;
  landingPaths: Set<string>;
  /** Collection slug → its landing path, if it has one. */
  collections: Map<string, string | null>;
  products: Map<string, ProductRoute>;
  /** Brands with at least one product on sale, published Journal posts and published pages. */
  brands: Set<string>;
  posts: Set<string>;
  pages: Set<string>;
  /** What the 404 page shows: shop name, main categories, bestsellers. */
  notFound: NotFoundData;
};

let connection: Database.Database | null | undefined;
let registry: Registry | undefined;

function open(): Database.Database | null {
  if (connection !== undefined) return connection;
  try {
    connection = new Database(databaseFile(), { readonly: true, fileMustExist: true });
  } catch {
    // No database yet (first deploy before migrations): pages decide for themselves.
    connection = null;
  }
  return connection;
}

export function getRouteRegistry(): Registry | null {
  const db = open();
  if (!db) return null;
  try {
    const version = Number(db.pragma("data_version", { simple: true }));
    if (registry && registry.version === version) return registry;
    const categories = db.prepare(`SELECT "path" FROM "Category" WHERE "storeId" = 'main' AND "isActive" = 1`).all() as { path: string }[];
    const collections = db
      .prepare(`SELECT "slug", "landingPath" FROM "Collection" WHERE "storeId" = 'main' AND "isActive" = 1`)
      .all() as { slug: string; landingPath: string | null }[];
    const products = db
      .prepare(
        `SELECT p."slug" AS slug, p."status" AS status, r."slug" AS replacement
         FROM "Product" p LEFT JOIN "Product" r ON r."id" = p."replacementProductId" AND r."status" = 'ACTIVE'
         WHERE p."storeId" = 'main'`,
      )
      .all() as { slug: string; status: string; replacement: string | null }[];
    const brands = db
      .prepare(
        `SELECT DISTINCT b."slug" AS slug FROM "Brand" b JOIN "Product" p ON p."brandId" = b."id"
         WHERE b."storeId" = 'main' AND b."isActive" = 1 AND p."status" = 'ACTIVE'`,
      )
      .all() as { slug: string }[];
    const posts = db.prepare(`SELECT "slug" FROM "Post" WHERE "storeId" = 'main' AND "status" = 'PUBLISHED'`).all() as { slug: string }[];
    const pages = db.prepare(`SELECT "slug" FROM "Page" WHERE "storeId" = 'main' AND "status" = 'PUBLISHED'`).all() as { slug: string }[];
    const settings = db.prepare(`SELECT "storeName" FROM "StoreSettings" WHERE "storeId" = 'main'`).get() as { storeName: string } | undefined;
    const menu = db
      .prepare(
        `SELECT "id", "name", "path", "parentId" FROM "Category"
         WHERE "storeId" = 'main' AND "isActive" = 1 AND "showInMenu" = 1 AND "depth" <= 1
         ORDER BY "depth", "position"`,
      )
      .all() as { id: string; name: string; path: string; parentId: string | null }[];
    const bestsellers = db
      .prepare(
        `SELECT "slug", "title", "minPrice" FROM "Product" WHERE "storeId" = 'main' AND "status" = 'ACTIVE'
         ORDER BY "inStock" DESC, "bestsellerScore" DESC, "publishedAt" DESC LIMIT 6`,
      )
      .all() as { slug: string; title: string; minPrice: number }[];
    registry = {
      version,
      categories: new Set(categories.map((row) => row.path)),
      landingPaths: new Set(collections.flatMap((row) => (row.landingPath ? [row.landingPath] : []))),
      collections: new Map(collections.map((row) => [row.slug, row.landingPath])),
      products: new Map(products.map((row) => [row.slug, { status: row.status, replacement: row.replacement }])),
      brands: new Set(brands.map((row) => row.slug)),
      posts: new Set(posts.map((row) => row.slug)),
      pages: new Set(pages.map((row) => row.slug)),
      notFound: {
        storeName: settings?.storeName ?? "MN Shoes & Watches",
        departments: menu
          .filter((row) => !row.parentId)
          .map((row) => ({
            name: row.name,
            path: row.path,
            children: menu.filter((child) => child.parentId === row.id).map((child) => ({ name: child.name, path: child.path })),
          })),
        bestsellers: bestsellers.map((row) => ({ title: row.title, slug: row.slug, minPrice: Number(row.minPrice) })),
      },
    };
    return registry;
  } catch (error) {
    // A missing table (migrations not yet run) must not take the shop down.
    console.error("[routes] could not read the route registry", error);
    return null;
  }
}

/**
 * First path segments that belong to fixed routes. Anything else is a category or collection
 * landing path and must exist in the registry. tests/unit/routing.test.ts checks this list
 * against the folders in app/.
 */
export const FIXED_SEGMENTS = new Set([
  "",
  "product",
  "collections",
  "sale",
  "search",
  "account",
  "cart",
  "checkout",
  "wishlist",
  "track",
  "order",
  "journal",
  "about",
  "contact",
  "faq",
  "stores",
  "policies",
  "pages",
  "gift-guides",
  "review",
  "unsubscribe",
  "admin",
  "feeds",
  "sitemaps",
  "brands",
]);

/**
 * Files served at the site root by app/ metadata routes (app/robots.ts, app/icon.svg). Any other
 * root path with an extension (/old-photo.jpg, /wp-login.php) is a real 404, not a 200 error page.
 * tests/unit/routing.test.ts checks this list against the files in app/.
 */
export const FIXED_FILES = new Set(["robots.txt", "icon.svg"]);

export type RouteDecision = { action: "pass" } | { action: "not-found" } | { action: "redirect"; location: string };

/** Pure decision for one pathname, given the registry. */
export function decideRoute(
  pathname: string,
  routes: Pick<Registry, "categories" | "landingPaths" | "collections" | "products"> & Partial<Pick<Registry, "brands" | "posts" | "pages">>,
): RouteDecision {
  const trimmed = pathname.replace(/\/+$/, "");
  const segments = trimmed.split("/").slice(1).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  const first = segments[0] ?? "";

  if (first === "product") {
    if (segments.length !== 2) return { action: "not-found" };
    const product = routes.products.get(segments[1]!);
    if (!product) return { action: "not-found" };
    if (product.status === "ACTIVE") return { action: "pass" };
    if (product.status === "ARCHIVED" && product.replacement) return { action: "redirect", location: `/product/${product.replacement}` };
    return { action: "not-found" };
  }

  if (first === "collections" && segments.length === 2) {
    const collection = routes.collections.get(segments[1]!);
    if (collection === undefined) return { action: "not-found" };
    // One URL per page: a collection with a landing path lives only there.
    return collection ? { action: "redirect", location: `/${collection}` } : { action: "pass" };
  }

  // Detail pages under fixed sections exist only for known slugs.
  const detail: Record<string, Set<string> | undefined> = { brands: routes.brands, journal: routes.posts, policies: routes.pages };
  if (first in detail && segments.length >= 2) {
    const known = detail[first];
    if (!known) return { action: "pass" };
    return segments.length === 2 && known.has(segments[1]!) ? { action: "pass" } : { action: "not-found" };
  }

  if (FIXED_SEGMENTS.has(first)) return { action: "pass" };
  if (segments.length === 1 && FIXED_FILES.has(first)) return { action: "pass" };

  const path = segments.join("/");
  return routes.categories.has(path) || routes.landingPaths.has(path) ? { action: "pass" } : { action: "not-found" };
}
