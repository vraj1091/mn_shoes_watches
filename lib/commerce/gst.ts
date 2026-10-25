/*
 * GST on GST-inclusive prices (DECISIONS.md 5). Indian retail prices include GST, so tax is taken
 * out of the price rather than added on. Some goods have price slabs: footwear up to ₹2,500 taxable
 * value per unit is taxed at 5%, above that at 18%. The slab is chosen per unit, on the value
 * before tax. All amounts are integer paise.
 */

export type TaxSlab = { maxUnitValue: number | null; rateBp: number };

/** Used when a product has no tax class yet; 18% is the rate for most of what the shop sells. */
export const DEFAULT_SLABS: TaxSlab[] = [{ maxUnitValue: null, rateBp: 1800 }];

const taxableOf = (inclusive: number, rateBp: number) => Math.round((inclusive * 10_000) / (10_000 + rateBp));

/** The slab that applies to one unit sold at this GST-inclusive price. */
export function rateForUnitPrice(unitPrice: number, slabs: TaxSlab[] = DEFAULT_SLABS): number {
  const ordered = [...(slabs.length ? slabs : DEFAULT_SLABS)].sort(
    (a, b) => (a.maxUnitValue ?? Number.POSITIVE_INFINITY) - (b.maxUnitValue ?? Number.POSITIVE_INFINITY),
  );
  for (const slab of ordered) {
    if (slab.maxUnitValue === null || taxableOf(unitPrice, slab.rateBp) <= slab.maxUnitValue) return slab.rateBp;
  }
  return ordered.at(-1)!.rateBp;
}

/** Splits a GST-inclusive amount into taxable value and tax at a rate. */
export function splitInclusive(amount: number, rateBp: number): { taxable: number; tax: number } {
  const taxable = taxableOf(amount, rateBp);
  return { taxable, tax: amount - taxable };
}

/**
 * Intra-state supply (same state as the shop) splits GST equally into CGST and SGST; inter-state
 * supply is charged as IGST. Used on invoices.
 */
export function gstHeads(tax: number, sameState: boolean): { cgst: number; sgst: number; igst: number } {
  if (!sameState) return { cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.floor(tax / 2);
  return { cgst, sgst: tax - cgst, igst: 0 };
}
