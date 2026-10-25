/**
 * Variant selection on the product page: which option values exist, which are sold out given the
 * other choices, and which variant a full selection points to. Pure, so it runs on the server for
 * the first render and in the browser as the shopper picks.
 */

export type OptionDef = {
  attributeId: string;
  code: string;
  name: string;
  style: "SWATCH" | "BUTTON";
  values: { id: string; label: string; hex: string | null }[];
};

export type VariantDef = {
  id: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  /** attributeId → valueId */
  values: Record<string, string>;
};

export type Selection = Record<string, string | undefined>;

const matches = (variant: VariantDef, selection: Selection, skip?: string) =>
  Object.entries(selection).every(([attributeId, valueId]) => attributeId === skip || !valueId || variant.values[attributeId] === valueId);

export function findVariant(variants: VariantDef[], options: OptionDef[], selection: Selection): VariantDef | null {
  if (options.length === 0) return variants[0] ?? null;
  if (options.some((option) => !selection[option.attributeId])) return null;
  return variants.find((variant) => matches(variant, selection)) ?? null;
}

/** Could the shopper buy this value, given what else they have chosen? */
export function isValueAvailable(variants: VariantDef[], selection: Selection, attributeId: string, valueId: string): boolean {
  return variants.some((variant) => variant.values[attributeId] === valueId && variant.stock > 0 && matches(variant, selection, attributeId));
}

/** Does any variant (in stock or not) have this value with the other choices? */
export function valueExists(variants: VariantDef[], selection: Selection, attributeId: string, valueId: string): boolean {
  return variants.some((variant) => variant.values[attributeId] === valueId && matches(variant, selection, attributeId));
}

/**
 * Starting selection. A variant named in the URL wins. Otherwise colour-like options start on the
 * first value that is in stock, while sizes start empty so the shopper chooses their own.
 */
export function initialSelection(variants: VariantDef[], options: OptionDef[], requestedVariantId?: string | null): Selection {
  const requested = variants.find((variant) => variant.id === requestedVariantId);
  if (requested) return { ...requested.values };
  const selection: Selection = {};
  for (const option of options) {
    if (isSizeOption(option)) continue;
    const firstAvailable = option.values.find((value) => isValueAvailable(variants, selection, option.attributeId, value.id));
    selection[option.attributeId] = (firstAvailable ?? option.values[0])?.id;
  }
  return selection;
}

export const isSizeOption = (option: Pick<OptionDef, "code">) => option.code === "size_uk" || option.code === "size";

/** Price shown before a full selection: one price, or "from" the lowest. */
export function priceSummary(variants: VariantDef[]): { price: number; from: boolean; compareAtPrice: number | null } {
  const sorted = [...variants].sort((a, b) => a.price - b.price);
  const lowest = sorted[0];
  if (!lowest) return { price: 0, from: false, compareAtPrice: null };
  const from = sorted.some((variant) => variant.price !== lowest.price);
  return { price: lowest.price, from, compareAtPrice: lowest.compareAtPrice && lowest.compareAtPrice > lowest.price ? lowest.compareAtPrice : null };
}
