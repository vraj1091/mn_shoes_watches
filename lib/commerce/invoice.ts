import { gstHeads, splitInclusive } from "./gst";
import { istDateKey } from "@/lib/format/date";

/** Indian financial years run April to March: an invoice on 26 Oct 2026 belongs to "2026-27". */
export function financialYear(date: Date): string {
  const [year, month] = istDateKey(date).split("-").map(Number) as [number, number];
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export type InvoiceLine = {
  description: string;
  sku: string;
  hsn: string;
  quantity: number;
  rateBp: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
};

/**
 * The lines printed on a tax invoice: each item at its own GST rate, then delivery and the COD fee
 * as service lines at 18%. Same state as the shop means CGST + SGST, anything else IGST.
 */
export function invoiceLines(
  order: {
    items: { productTitle: string; variantTitle: string | null; sku: string; hsnCode: string; gstRateBp: number; quantity: number; lineTotal: number; taxableValue: number; taxAmount: number }[];
    shippingTotal: number;
    codFee: number;
  },
  sameState: boolean,
): InvoiceLine[] {
  const lines: InvoiceLine[] = order.items.map((item) => ({
    description: item.variantTitle && item.variantTitle !== "Default" ? `${item.productTitle} (${item.variantTitle})` : item.productTitle,
    sku: item.sku,
    hsn: item.hsnCode,
    quantity: item.quantity,
    rateBp: item.gstRateBp,
    taxable: item.taxableValue,
    ...gstHeads(item.taxAmount, sameState),
    total: item.lineTotal,
  }));
  for (const [description, amount] of [
    ["Delivery", order.shippingTotal],
    ["Cash on delivery fee", order.codFee],
  ] as const) {
    if (amount <= 0) continue;
    const { taxable, tax } = splitInclusive(amount, 1800);
    lines.push({ description, sku: "", hsn: "996812", quantity: 1, rateBp: 1800, taxable, ...gstHeads(tax, sameState), total: amount });
  }
  return lines;
}
