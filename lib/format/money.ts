/** All money is stored as integer paise. These helpers are the only place rupees appear. */

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const rupeesWithPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹2,499 for whole rupees, ₹2,499.50 when there are paise. Uses Indian digit grouping (₹1,24,999). */
export function formatPrice(paise: number): string {
  if (!Number.isInteger(paise)) throw new TypeError(`Price must be integer paise, got ${paise}`);
  return paise % 100 === 0 ? rupees.format(paise / 100) : rupeesWithPaise.format(paise / 100);
}

/** Always two decimals, for invoices and tax lines. */
export function formatPriceExact(paise: number): string {
  if (!Number.isInteger(paise)) throw new TypeError(`Price must be integer paise, got ${paise}`);
  return rupeesWithPaise.format(paise / 100);
}

/** Parses "2499", "2,499.50" or "₹ 2,499" typed in the admin into paise. Returns null if invalid. */
export function parseRupees(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = "0", fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** Whole-number percentage off, rounded down so the badge never overstates the saving. */
export function percentOff(pricePaise: number, compareAtPaise: number | null | undefined): number {
  if (!compareAtPaise || compareAtPaise <= pricePaise) return 0;
  return Math.floor(((compareAtPaise - pricePaise) / compareAtPaise) * 100);
}
