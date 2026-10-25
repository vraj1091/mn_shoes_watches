import { splitInclusive } from "./gst";

/*
 * Order totals, as one pure function used by the bag, checkout (on the server) and the demo seed,
 * so the numbers can never disagree. Prices include GST; amounts are integer paise.
 */

export type PricedLine = { key: string; unitPrice: number; quantity: number; rateBp: number };

export type CouponRule = {
  code: string;
  type: "PERCENT" | "FLAT" | "FREE_SHIPPING";
  value: number; // PERCENT: basis points; FLAT: paise
  minOrderValue: number | null;
  maxDiscount: number | null;
};

export type TotalsInput = {
  lines: PricedLine[];
  coupon: CouponRule | null;
  freeShippingThreshold: number | null;
  shippingRate: number;
  paymentMethod: "PREPAID" | "COD" | null;
  codFee: number;
};

export type LineTotals = { key: string; lineSubtotal: number; discount: number; lineTotal: number; taxable: number; tax: number };

export type Totals = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  codFee: number;
  taxTotal: number;
  grandTotal: number;
  lines: LineTotals[];
  /** Why a coupon gives nothing, when it is entered but not met. */
  couponProblem: "MIN_ORDER" | null;
  /** How much more to spend for free delivery; null when there is no threshold. */
  freeShippingRemaining: number | null;
};

/** GST on delivery and COD charges: 18%, the rate for courier services. */
export const FEE_RATE_BP = 1800;

function couponDiscount(subtotal: number, coupon: CouponRule | null): { discount: number; problem: Totals["couponProblem"] } {
  if (!coupon) return { discount: 0, problem: null };
  if (coupon.minOrderValue !== null && subtotal < coupon.minOrderValue) return { discount: 0, problem: "MIN_ORDER" };
  if (coupon.type === "PERCENT") {
    const raw = Math.floor((subtotal * coupon.value) / 10_000);
    return { discount: Math.min(raw, coupon.maxDiscount ?? raw, subtotal), problem: null };
  }
  if (coupon.type === "FLAT") return { discount: Math.min(coupon.value, subtotal), problem: null };
  return { discount: 0, problem: null };
}

/** Spreads a discount over lines in proportion to their value; the remainder goes to the largest lines. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (total * weight) / sum);
  const shares = exact.map(Math.floor);
  let left = total - shares.reduce((acc, share) => acc + share, 0);
  const order = exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest);
  for (const { index } of order) {
    if (left <= 0) break;
    shares[index]! += 1;
    left -= 1;
  }
  return shares;
}

export function computeTotals(input: TotalsInput): Totals {
  const subtotal = input.lines.reduce((acc, line) => acc + line.unitPrice * line.quantity, 0);
  const { discount, problem } = couponDiscount(subtotal, input.coupon);
  const shares = allocate(discount, input.lines.map((line) => line.unitPrice * line.quantity));

  const lines = input.lines.map((line, index) => {
    const lineSubtotal = line.unitPrice * line.quantity;
    const lineTotal = lineSubtotal - shares[index]!;
    const { taxable, tax } = splitInclusive(lineTotal, line.rateBp);
    return { key: line.key, lineSubtotal, discount: shares[index]!, lineTotal, taxable, tax };
  });

  const afterDiscount = subtotal - discount;
  const freeByCoupon = input.coupon?.type === "FREE_SHIPPING" && problem === null;
  const freeByThreshold = input.freeShippingThreshold !== null && afterDiscount >= input.freeShippingThreshold;
  const shippingTotal = subtotal === 0 || freeByCoupon || freeByThreshold ? 0 : input.shippingRate;
  const codFee = input.paymentMethod === "COD" && subtotal > 0 ? input.codFee : 0;
  const feeTax = splitInclusive(shippingTotal + codFee, FEE_RATE_BP).tax;

  return {
    subtotal,
    discountTotal: discount,
    shippingTotal,
    codFee,
    taxTotal: lines.reduce((acc, line) => acc + line.tax, 0) + feeTax,
    grandTotal: afterDiscount + shippingTotal + codFee,
    lines,
    couponProblem: problem,
    freeShippingRemaining: input.freeShippingThreshold === null ? null : Math.max(0, input.freeShippingThreshold - afterDiscount),
  };
}
