import "server-only";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { getCategoryByPath, getCollectionByLandingPath, getCollectionBySlug, getSynonyms } from "@/lib/data/catalog";
import { searchProducts } from "@/lib/search/engine";
import { t } from "@/lib/i18n";
import { applyCollectionRules } from "./rules";
import {
  brandFacet,
  categoryFacets,
  genderFacet,
  departmentFacet,
  descendantIds,
  parseListingState,
  productsInCategories,
  runListing,
  type FacetDef,
  type ListingResult,
  type ListingState,
  type SortKey,
} from "./query";
import type { CatalogIndex, IndexedProduct } from "./types";

/*
 * One place that turns "category X / collection Y / sale / search Z" plus the URL's filters into
 * a listing. Pages and the "Show more" server action both call it, so they can never disagree.
 */

export type ScopeRef =
  | { kind: "category"; path: string }
  | { kind: "brand"; slug: string }
  | { kind: "collection"; slug: string }
  | { kind: "landing"; path: string }
  | { kind: "sale" }
  | { kind: "search"; q: string };

type SearchParams = Record<string, string | string[] | undefined>;

export type ResolvedListing = {
  index: CatalogIndex;
  basePath: string;
  defaultSort: SortKey;
  facets: FacetDef[];
  state: ListingState;
  result: ListingResult;
  /** Total products before filters, for "no products yet" versus "no products match". */
  scopeSize: number;
  corrected?: string | null;
};

const LARGE = 1_000_000;

function categoryScope(index: CatalogIndex, categoryId: string) {
  const ids = descendantIds(index.categories, categoryId);
  return {
    products: productsInCategories(index.products, ids),
    // Manual order in this category first (admin drag-and-drop), then everything else.
    relevance: (product: IndexedProduct) => product.categoryPositions[categoryId] ?? LARGE,
  };
}

export async function resolveListing(ref: ScopeRef, params: SearchParams): Promise<ResolvedListing | null> {
  const index = await getCatalogIndex();
  let products: IndexedProduct[];
  let facets: FacetDef[];
  let basePath: string;
  let defaultSort: SortKey = "relevance";
  let relevance: ((product: IndexedProduct) => number) | undefined;
  let corrected: string | null | undefined;
  const departments = departmentFacet(index.categories, t("catalog.category"));
  const gender = genderFacet(t("catalog.gender"), { MEN: t("catalog.genderMen"), WOMEN: t("catalog.genderWomen"), UNISEX: t("catalog.genderUnisex") });
  const withBrands = (list: FacetDef[], scope: IndexedProduct[]) => {
    const brands = brandFacet(scope, t("catalog.brand"));
    return brands ? [...list, brands] : list;
  };

  switch (ref.kind) {
    case "category": {
      const category = await getCategoryByPath(ref.path);
      if (!category) return null;
      ({ products, relevance } = categoryScope(index, category.id));
      // Watches and perfumes are made for men, women or both, so they filter by that first.
      const department = category.path.split("/")[0]!;
      facets = withBrands([...(["watches", "perfumes"].includes(department) ? [gender] : []), ...categoryFacets(index.categories, index.attributes, category.id)], products);
      basePath = `/${category.path}`;
      break;
    }
    case "brand": {
      const brand = index.products.find((product) => product.brand?.slug === ref.slug)?.brand;
      if (!brand) return null;
      products = index.products.filter((product) => product.brand?.slug === ref.slug);
      facets = [departments, gender];
      basePath = `/brands/${ref.slug}`;
      break;
    }
    case "collection":
    case "landing": {
      const collection = ref.kind === "collection" ? await getCollectionBySlug(ref.slug) : await getCollectionByLandingPath(ref.path);
      if (!collection) return null;
      if (collection.type === "MANUAL") {
        products = index.products.filter((product) => product.id in collection.manualProducts);
        relevance = (product) => collection.manualProducts[product.id] ?? LARGE;
      } else {
        products = applyCollectionRules(index.products, collection.rules, collection.matchAll, {
          categories: index.categories,
          attributes: index.attributes,
          now: Date.now(),
        });
      }
      // A collection inside one department filters like that department.
      const categoryRule = collection.rules.find((rule) => rule.field === "category");
      const department = categoryRule?.field === "category" && categoryRule.value.length === 1
        ? index.categories.find((category) => category.path === categoryRule.value[0])
        : undefined;
      facets = withBrands(department ? categoryFacets(index.categories, index.attributes, department.id) : [departments], products);
      basePath = collection.landingPath ? `/${collection.landingPath}` : `/collections/${collection.slug}`;
      defaultSort = collection.defaultSort;
      break;
    }
    case "sale": {
      products = index.products.filter((product) => product.maxDiscountBp > 0);
      facets = withBrands([departments], products);
      basePath = "/sale";
      defaultSort = "bestselling";
      break;
    }
    case "search": {
      const outcome = await searchProducts(ref.q, await getSynonyms());
      const rank = new Map(outcome.ids.map((id, position) => [id, position]));
      products = index.products.filter((product) => rank.has(product.id));
      relevance = (product) => rank.get(product.id) ?? LARGE;
      corrected = outcome.corrected;
      facets = withBrands([departments], products);
      basePath = `/search?q=${encodeURIComponent(ref.q)}`;
      break;
    }
  }

  const state = parseListingState(params, facets, defaultSort);
  const result = runListing(products, state, facets, { relevance });
  return { index, basePath, defaultSort, facets, state, result, scopeSize: products.length, corrected };
}
