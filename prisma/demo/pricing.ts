/** Demo prices: DummyJSON's US dollar prices turned into rupee prices that end in 99. */

export const USD_TO_INR = 85;

/** round(price × 85 / 100) × 100 − 1 rupees (brief, Phase 2), returned in paise. */
export function inrFromUsd(usd: number): number {
  const rupees = Math.max(1, Math.round((usd * USD_TO_INR) / 100)) * 100 - 1;
  return rupees * 100;
}

/** A compare-at (MRP) price only for real discounts of 8% or more, worked back from the sale price. */
export function compareAtFromDiscount(usd: number, discountPercentage: number): number | null {
  if (!(discountPercentage >= 8) || discountPercentage >= 100) return null;
  const compareAt = inrFromUsd(usd / (1 - discountPercentage / 100));
  return compareAt > inrFromUsd(usd) ? compareAt : null;
}
