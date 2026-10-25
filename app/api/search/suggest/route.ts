import { getCatalogIndex } from "@/lib/data/catalog-index";
import { getSynonyms } from "@/lib/data/catalog";
import { ancestors } from "@/lib/catalog/query";
import { searchProducts } from "@/lib/search/engine";
import { normalise, tokenize } from "@/lib/search/text";
import { formatPrice } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import type { Suggestions } from "@/lib/search/types";

/** Instant suggestions after two characters (Part 4): products, matching categories, and a spelling fix. */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  const empty: Suggestions = { products: [], categories: [], corrected: null };
  if (q.length < 2) return Response.json(empty);

  const [index, synonyms] = await Promise.all([getCatalogIndex(), getSynonyms()]);
  const outcome = await searchProducts(q, synonyms, 6);
  const byId = new Map(index.products.map((product) => [product.id, product]));

  const products = outcome.ids
    .map((id) => byId.get(id))
    .filter((product) => product !== undefined)
    .slice(0, 6)
    .map((product) => ({
      title: product.title,
      href: `/product/${product.slug}`,
      price: product.maxPrice > product.minPrice ? t("catalog.from", { price: formatPrice(product.minPrice) }) : formatPrice(product.minPrice),
      image: product.image?.url ?? null,
    }));

  // A category matches when every word appears in its name or its parents' names ("men watch" → Watches › Men).
  const tokens = tokenize(outcome.corrected ?? q).filter((token) => token.length >= 2);
  const categories = index.categories
    .map((category) => {
      const trail = ancestors(index.categories, category.id);
      return { category, trail, text: normalise(trail.map((node) => node.name).join(" ")) };
    })
    .filter(({ text }) => tokens.length > 0 && tokens.every((token) => text.includes(token)))
    .sort((a, b) => a.category.depth - b.category.depth || a.category.position - b.category.position)
    .slice(0, 4)
    .map(({ category, trail }) => ({
      name: category.name,
      context: trail.length > 1 ? trail.slice(0, -1).map((node) => node.name).join(" › ") : null,
      href: `/${category.path}`,
    }));

  const body: Suggestions = { products, categories, corrected: outcome.corrected };
  return Response.json(body, { headers: { "cache-control": "private, max-age=60" } });
}
