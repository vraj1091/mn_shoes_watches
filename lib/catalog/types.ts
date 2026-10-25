/** Shapes shared by the catalogue index, the listing engine and product cards. Plain data only. */

export type AttributeValueMeta = {
  id: string;
  value: string;
  slug: string;
  swatchHex: string | null;
  sortKey: number | null;
  position: number;
};

export type AttributeMeta = {
  id: string;
  code: string;
  name: string;
  type: "SELECT" | "MULTI_SELECT" | "NUMBER" | "TEXT" | "BOOLEAN";
  unit: string | null;
  isVariantAxis: boolean;
  isFilterable: boolean;
  filterStyle: "CHECKBOX" | "SWATCH" | "RANGE" | "TOGGLE";
  position: number;
  values: AttributeValueMeta[];
};

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId: string | null;
  depth: number;
  position: number;
  filterAttributeIds: string[];
};

export type CardImage = { url: string; alt: string; width: number; height: number; blurDataUrl: string | null };

export type Swatch = { valueId: string; label: string; hex: string };

export type IndexedProduct = {
  id: string;
  slug: string;
  title: string;
  primaryCategoryId: string | null;
  /** Categories the product is assigned to directly, with its manual position in each. */
  categoryPositions: Record<string, number>;
  gender: "MEN" | "WOMEN" | "UNISEX" | null;
  minPrice: number;
  maxPrice: number;
  /** Compare-at price of the cheapest variant, when it is higher than that variant's price. */
  compareAtPrice: number | null;
  maxDiscountBp: number;
  inStock: boolean;
  /** Units on hand across all active variants. */
  stockTotal: number;
  bestsellerScore: number;
  publishedAt: number;
  ratingAvg: number;
  ratingCount: number;
  /** Product-level SELECT / MULTI_SELECT values. */
  attributeValueIds: string[];
  /** Product-level NUMBER values, keyed by attribute id. */
  numberValues: Record<string, number>;
  /** Variant option values with at least one active variant in stock. */
  availableAxisValueIds: string[];
  swatches: Swatch[];
  tagSlugs: string[];
  image: CardImage | null;
  hoverImage: CardImage | null;
};

export type CatalogIndex = {
  products: IndexedProduct[];
  attributes: AttributeMeta[];
  categories: CategoryNode[];
  lowStockThreshold: number;
};

/** What a product card needs; built from an IndexedProduct so cards can render on server or client. */
export type ProductCardData = {
  id: string;
  href: string;
  title: string;
  minPrice: number;
  maxPrice: number;
  compareAtPrice: number | null;
  inStock: boolean;
  lowStockCount: number | null;
  isNew: boolean;
  swatches: Swatch[];
  ratingAvg: number;
  ratingCount: number;
  image: CardImage | null;
  hoverImage: CardImage | null;
};
