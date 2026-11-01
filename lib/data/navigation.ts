import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";

export type NavCategory = {
  id: string;
  name: string;
  href: string;
  children: NavCategory[];
};

/** Category URLs are the category path from the root: /mens-shoes/formal/oxfords */
export const categoryHref = (path: string) => `/${path}`;

async function loadCategoryNavigation(): Promise<NavCategory[]> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.categories);

  // Three levels make the mega menu: department → group column → links.
  const rows = await prisma.category.findMany({
    where: { storeId: DEFAULT_STORE_ID, isActive: true, showInMenu: true, depth: { lte: 2 } },
    select: { id: true, name: true, path: true, parentId: true },
    orderBy: [{ depth: "asc" }, { position: "asc" }, { name: "asc" }],
  });

  const byId = new Map<string, NavCategory>();
  const roots: NavCategory[] = [];
  for (const row of rows) {
    const node: NavCategory = { id: row.id, name: row.name, href: categoryHref(row.path), children: [] };
    byId.set(row.id, node);
    if (!row.parentId) roots.push(node);
    else byId.get(row.parentId)?.children.push(node);
  }
  return roots;
}

export async function getCategoryNavigation(): Promise<NavCategory[]> {
  await connection();
  return loadCategoryNavigation();
}
