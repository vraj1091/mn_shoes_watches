import type { AttributeMeta, CategoryNode, IndexedProduct } from "./types";

/*
 * The listing engine: parse filters from the URL, filter products, count facets, sort and page.
 * Pure functions over the catalogue index, shared by category, collection, sale and search pages.
 *
 * URL format: ?colour=tan&colour=black&size_uk=uk-8&price=1000-2500&in_stock=1&sort=price-asc&page=2
 * Values within one filter are OR-ed; different filters are AND-ed. Prices in the URL are rupees.
 */

export const SORTS = ["relevance", "newest", "price-asc", "price-desc", "bestselling"] as const;
export type SortKey = (typeof SORTS)[number];

export const PAGE_SIZE = 24;

export type PriceRange = { min: number; max: number | null }; // paise; max null = no upper limit

export const PRICE_BUCKETS: PriceRange[] = [
  { min: 0, max: 1_000_00 },
  { min: 1_000_00, max: 2_500_00 },
  { min: 2_500_00, max: 5_000_00 },
  { min: 5_000_00, max: 10_000_00 },
  { min: 10_000_00, max: 25_000_00 },
  { min: 25_000_00, max: null },
];

/** A filter whose values are tested with a function: brand, and who a product is for. */
export type OptionFacet = { kind: "options"; key: string; label: string; options: { slug: string; label: string; match: (product: IndexedProduct) => boolean }[] };

export type FacetDef =
  | { kind: "attribute"; key: string; label: string; attribute: AttributeMeta }
  | { kind: "category"; key: "category"; label: string; options: { slug: string; label: string; categoryIds: Set<string> }[] }
  | OptionFacet;

export type ListingState = {
  selections: Record<string, string[]>;
  price: PriceRange | null;
  inStock: boolean;
  sort: SortKey;
  page: number;
};

export type FacetValue = { slug: string; label: string; count: number; selected: boolean; swatchHex: string | null };
export type FacetResult = { key: string; label: string; style: "CHECKBOX" | "SWATCH"; values: FacetValue[] };
export type PriceBucketResult = { slug: string; range: PriceRange; count: number; selected: boolean };

export type ListingResult = {
  items: IndexedProduct[];
  total: number;
  page: number;
  pageCount: number;
  facets: FacetResult[];
  priceBuckets: PriceBucketResult[];
  inStockCount: number;
  activeFilterCount: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

const list = (value: string | string[] | undefined): string[] =>
  (Array.isArray(value) ? value : value ? [value] : []).flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean);

export const priceSlug = (range: PriceRange) => `${range.min / 100}-${range.max === null ? "" : range.max / 100}`;

export function parsePrice(value: string | undefined): PriceRange | null {
  if (!value) return null;
  const match = /^(\d{1,7})-(\d{1,7})?$/.exec(value);
  if (!match) return null;
  const min = Number(match[1]) * 100;
  const max = match[2] ? Number(match[2]) * 100 : null;
  if (max !== null && max <= min) return null;
  return { min, max };
}

/** Slug for a NUMBER attribute value (dial size 42 → "42", water resistance 100 → "100"). */
const numberSlug = (value: number) => String(Number(value.toFixed(2)));

export function parseListingState(params: SearchParams, facets: FacetDef[], defaultSort: SortKey): ListingState {
  const selections: Record<string, string[]> = {};
  for (const facet of facets) {
    const values = list(params[facet.key]);
    if (values.length) selections[facet.key] = [...new Set(values)];
  }
  const sortParam = list(params.sort)[0];
  const sort = (SORTS as readonly string[]).includes(sortParam ?? "") ? (sortParam as SortKey) : defaultSort;
  const pageNumber = Number(list(params.page)[0] ?? "1");
  return {
    selections,
    price: parsePrice(list(params.price)[0]),
    inStock: list(params.in_stock)[0] === "1",
    sort,
    page: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
  };
}

/** Does a product match one facet's selected values? */
function matchesFacet(product: IndexedProduct, facet: FacetDef, selected: string[]): boolean {
  if (facet.kind === "options") return facet.options.some((option) => selected.includes(option.slug) && option.match(product));
  if (facet.kind === "category") {
    return facet.options.some(
      (option) => selected.includes(option.slug) && Object.keys(product.categoryPositions).some((id) => option.categoryIds.has(id)),
    );
  }
  const { attribute } = facet;
  if (attribute.type === "NUMBER") {
    const value = product.numberValues[attribute.id];
    return value !== undefined && selected.includes(numberSlug(value));
  }
  const ids = attribute.values.filter((value) => selected.includes(value.slug)).map((value) => value.id);
  // Variant options (size, colour, volume) count only when that option is actually in stock.
  const pool = attribute.isVariantAxis ? product.availableAxisValueIds : product.attributeValueIds;
  return ids.some((id) => pool.includes(id));
}

const inRange = (price: number, range: PriceRange) => price >= range.min && (range.max === null || price < range.max);

type Predicate = (product: IndexedProduct) => boolean;

function buildPredicates(state: ListingState, facets: FacetDef[]): Map<string, Predicate> {
  const predicates = new Map<string, Predicate>();
  for (const facet of facets) {
    const selected = state.selections[facet.key];
    if (selected?.length) predicates.set(facet.key, (product) => matchesFacet(product, facet, selected));
  }
  if (state.price) {
    const range = state.price;
    predicates.set("price", (product) => inRange(product.minPrice, range));
  }
  if (state.inStock) predicates.set("in_stock", (product) => product.inStock);
  return predicates;
}

const passesAll = (product: IndexedProduct, predicates: Map<string, Predicate>, except?: string) => {
  for (const [key, predicate] of predicates) {
    if (key !== except && !predicate(product)) return false;
  }
  return true;
};

export type ListingOptions = {
  pageSize?: number;
  /** Rank for "relevance": lower comes first (search position, or manual category order). */
  relevance?: (product: IndexedProduct) => number;
};

export function sortProducts(products: IndexedProduct[], sort: SortKey, relevance?: ListingOptions["relevance"]): IndexedProduct[] {
  const byBestseller = (a: IndexedProduct, b: IndexedProduct) => b.bestsellerScore - a.bestsellerScore || b.publishedAt - a.publishedAt;
  const compare: Record<SortKey, (a: IndexedProduct, b: IndexedProduct) => number> = {
    relevance: (a, b) => (relevance ? relevance(a) - relevance(b) : 0) || byBestseller(a, b),
    newest: (a, b) => b.publishedAt - a.publishedAt,
    "price-asc": (a, b) => a.minPrice - b.minPrice,
    "price-desc": (a, b) => b.minPrice - a.minPrice,
    bestselling: byBestseller,
  };
  // Sold-out products always go to the end, whatever the sort.
  return [...products].sort((a, b) => Number(b.inStock) - Number(a.inStock) || compare[sort](a, b) || a.title.localeCompare(b.title));
}

function facetValues(facet: FacetDef, scope: IndexedProduct[], selected: string[]): FacetValue[] {
  if (facet.kind === "options" || facet.kind === "category") {
    return facet.options
      .map((option) => ({
        slug: option.slug,
        label: option.label,
        count: scope.filter((product) => matchesFacet(product, facet, [option.slug])).length,
        selected: selected.includes(option.slug),
        swatchHex: null,
      }))
      .filter((value) => value.count > 0 || value.selected);
  }
  const { attribute } = facet;
  if (attribute.type === "NUMBER") {
    const counts = new Map<string, number>();
    for (const product of scope) {
      const value = product.numberValues[attribute.id];
      if (value !== undefined) counts.set(numberSlug(value), (counts.get(numberSlug(value)) ?? 0) + 1);
    }
    for (const slug of selected) if (!counts.has(slug)) counts.set(slug, 0);
    return [...counts.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([slug, count]) => ({
        slug,
        label: attribute.unit ? `${slug} ${attribute.unit}` : slug,
        count,
        selected: selected.includes(slug),
        swatchHex: null,
      }));
  }
  return attribute.values
    .map((value) => ({
      slug: value.slug,
      label: value.value,
      count: scope.filter((product) => matchesFacet(product, facet, [value.slug])).length,
      selected: selected.includes(value.slug),
      swatchHex: value.swatchHex,
    }))
    .filter((value) => value.count > 0 || value.selected);
}

export function runListing(
  products: IndexedProduct[],
  state: ListingState,
  facets: FacetDef[],
  options: ListingOptions = {},
): ListingResult {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const predicates = buildPredicates(state, facets);
  const matching = products.filter((product) => passesAll(product, predicates));

  // Each facet counts against every other active filter, so its numbers show what a click would give.
  const facetResults: FacetResult[] = facets
    .map((facet) => {
      const scope = products.filter((product) => passesAll(product, predicates, facet.key));
      return {
        key: facet.key,
        label: facet.label,
        style: facet.kind === "attribute" && facet.attribute.filterStyle === "SWATCH" ? ("SWATCH" as const) : ("CHECKBOX" as const),
        values: facetValues(facet, scope, state.selections[facet.key] ?? []),
      };
    })
    .filter((facet) => facet.values.length > 0);

  const priceScope = products.filter((product) => passesAll(product, predicates, "price"));
  const priceBuckets = PRICE_BUCKETS.map((range) => ({
    slug: priceSlug(range),
    range,
    count: priceScope.filter((product) => inRange(product.minPrice, range)).length,
    selected: state.price !== null && priceSlug(state.price) === priceSlug(range),
  })).filter((bucket) => bucket.count > 0 || bucket.selected);

  const inStockCount = products.filter((product) => passesAll(product, predicates, "in_stock") && product.inStock).length;

  const sorted = sortProducts(matching, state.sort, options.relevance);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(state.page, pageCount);

  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageCount,
    facets: facetResults,
    priceBuckets,
    inStockCount,
    activeFilterCount: Object.values(state.selections).reduce((n, values) => n + values.length, 0) + (state.price ? 1 : 0) + (state.inStock ? 1 : 0),
  };
}

/** True when the URL narrows the listing, which makes the page noindex (Part 6). */
export const hasFilters = (state: ListingState) => Object.keys(state.selections).length > 0 || state.price !== null || state.inStock;

/** Builds a listing URL from a state, with optional changes; default values are left out of the URL. */
export function listingHref(basePath: string, state: ListingState, defaultSort: SortKey, change: Partial<ListingState> = {}): string {
  const next = { ...state, ...change };
  // The base may carry its own query, e.g. /search?q=oxford.
  const [path = "", baseQuery = ""] = basePath.split("?");
  const params = new URLSearchParams(baseQuery);
  for (const [key, values] of Object.entries(next.selections)) for (const value of values) params.append(key, value);
  if (next.price) params.set("price", priceSlug(next.price));
  if (next.inStock) params.set("in_stock", "1");
  if (next.sort !== defaultSort) params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Selections with one value added or removed. */
export function toggleSelection(state: ListingState, key: string, slug: string): Record<string, string[]> {
  const current = state.selections[key] ?? [];
  const values = current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug];
  const selections = { ...state.selections };
  if (values.length) selections[key] = values;
  else delete selections[key];
  return selections;
}

// ─── Category helpers ───────────────────────────────────────────────────────

export function descendantIds(categories: CategoryNode[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    children.set(category.parentId, [...(children.get(category.parentId) ?? []), category.id]);
  }
  const result = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const child of children.get(id) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return result;
}

export function ancestors(categories: CategoryNode[], categoryId: string): CategoryNode[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const chain: CategoryNode[] = [];
  let current = byId.get(categoryId);
  while (current) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export const productsInCategories = (products: IndexedProduct[], ids: Set<string>) =>
  products.filter((product) => Object.keys(product.categoryPositions).some((id) => ids.has(id)));

/** Attribute facets for a category: its own filter list, or the nearest ancestor's. */
export function categoryFacets(categories: CategoryNode[], attributes: AttributeMeta[], categoryId: string): FacetDef[] {
  const chain = ancestors(categories, categoryId).reverse();
  const withFilters = chain.find((category) => category.filterAttributeIds.length > 0);
  const byId = new Map(attributes.map((attribute) => [attribute.id, attribute]));
  return (withFilters?.filterAttributeIds ?? [])
    .map((id) => byId.get(id))
    .filter((attribute): attribute is AttributeMeta => Boolean(attribute?.isFilterable))
    .map((attribute) => ({ kind: "attribute", key: attribute.code, label: attribute.name, attribute }));
}

/** Brands present in a set of products, A to Z; none when only one brand is there. */
export function brandFacet(products: IndexedProduct[], label: string): OptionFacet | null {
  const brands = new Map<string, string>();
  for (const product of products) if (product.brand) brands.set(product.brand.slug, product.brand.name);
  if (brands.size < 2) return null;
  return {
    kind: "options",
    key: "brand",
    label,
    options: [...brands.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([slug, name]) => ({ slug, label: name, match: (product: IndexedProduct) => product.brand?.slug === slug })),
  };
}

/** Men / Women / Unisex, for watches and perfumes. */
export function genderFacet(label: string, names: Record<"MEN" | "WOMEN" | "UNISEX", string>): OptionFacet {
  return {
    kind: "options",
    key: "gender",
    label,
    options: (["MEN", "WOMEN", "UNISEX"] as const).map((gender) => ({
      slug: gender.toLowerCase(),
      label: names[gender],
      match: (product: IndexedProduct) => product.gender === gender,
    })),
  };
}

/** A "Category" facet over the top-level departments, for search and sale pages. */
export function departmentFacet(categories: CategoryNode[], label: string): FacetDef {
  return {
    kind: "category",
    key: "category",
    label,
    options: categories
      .filter((category) => category.depth === 0)
      .sort((a, b) => a.position - b.position)
      .map((category) => ({ slug: category.slug, label: category.name, categoryIds: descendantIds(categories, category.id) })),
  };
}
