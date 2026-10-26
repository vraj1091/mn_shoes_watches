import { describe, expect, it } from "vitest";
import { financialYear, invoiceLines } from "@/lib/commerce/invoice";
import { rupeesInWords } from "@/lib/format/words";
import { NEXT_STATUSES, RESTOCKS } from "@/lib/admin/order-status";

describe("invoice numbering", () => {
  it("puts dates in the Indian financial year, April to March, by IST date", () => {
    expect(financialYear(new Date("2026-10-26T10:00:00Z"))).toBe("2026-27");
    expect(financialYear(new Date("2027-03-31T12:00:00Z"))).toBe("2026-27");
    // 31 March 2027, 20:00 UTC is already 1 April in India.
    expect(financialYear(new Date("2027-03-31T20:00:00Z"))).toBe("2027-28");
    expect(financialYear(new Date("2099-12-31T00:00:00Z"))).toBe("2099-00");
  });
});

describe("invoice lines", () => {
  const order = {
    items: [
      { productTitle: "Derby shoes", variantTitle: "UK 9", sku: "MN-DRB-9", hsnCode: "6403", gstRateBp: 500, quantity: 1, lineTotal: 2_099_00, taxableValue: 1_999_05, taxAmount: 99_95 },
      { productTitle: "Attar", variantTitle: "Default", sku: "MN-ATR", hsnCode: "3303", gstRateBp: 1800, quantity: 2, lineTotal: 1_180_00, taxableValue: 1_000_00, taxAmount: 180_00 },
    ],
    shippingTotal: 99_00,
    codFee: 49_00,
  };

  it("splits GST into CGST and SGST inside the shop's state", () => {
    const lines = invoiceLines(order, true);
    expect(lines.map((line) => line.description)).toEqual(["Derby shoes (UK 9)", "Attar", "Delivery", "Cash on delivery fee"]);
    for (const line of lines) {
      expect(line.igst).toBe(0);
      expect(line.cgst + line.sgst + line.taxable).toBe(line.total);
      expect(Math.abs(line.cgst - line.sgst)).toBeLessThanOrEqual(1);
    }
  });

  it("charges IGST on deliveries to other states, and 18% inside delivery and COD charges", () => {
    const lines = invoiceLines(order, false);
    for (const line of lines) {
      expect(line.cgst + line.sgst).toBe(0);
      expect(line.igst + line.taxable).toBe(line.total);
    }
    const delivery = lines.find((line) => line.description === "Delivery")!;
    expect(delivery).toMatchObject({ rateBp: 1800, taxable: 83_90, igst: 15_10, hsn: "996812" });
  });

  it("leaves out free delivery and a zero COD fee", () => {
    expect(invoiceLines({ ...order, shippingTotal: 0, codFee: 0 }, true)).toHaveLength(2);
  });
});

describe("amount in words", () => {
  it("uses lakh and crore", () => {
    expect(rupeesInWords(12_248_00)).toBe("Rupees Twelve Thousand Two Hundred Forty-Eight Only");
    expect(rupeesInWords(1_24_999_00)).toBe("Rupees One Lakh Twenty-Four Thousand Nine Hundred Ninety-Nine Only");
    expect(rupeesInWords(2_00_00_000_00)).toBe("Rupees Two Crore Only");
    expect(rupeesInWords(99_50)).toBe("Rupees Ninety-Nine and Fifty Paise Only");
    expect(rupeesInWords(0)).toBe("Rupees Zero Only");
  });
});

describe("order status rules", () => {
  it("never lets a finished order change again", () => {
    expect(NEXT_STATUSES.DELIVERED).toEqual([]);
    expect(NEXT_STATUSES.CANCELLED).toEqual([]);
    expect(NEXT_STATUSES.RETURNED_TO_ORIGIN).toEqual([]);
  });

  it("allows cancelling only before the parcel leaves", () => {
    for (const status of ["SHIPPED", "OUT_FOR_DELIVERY"] as const) expect(NEXT_STATUSES[status]).not.toContain("CANCELLED");
    for (const status of ["AWAITING_COD_CONFIRMATION", "CONFIRMED", "PACKED"] as const) expect(NEXT_STATUSES[status]).toContain("CANCELLED");
  });

  it("restocks exactly when goods come back", () => {
    expect(RESTOCKS.sort()).toEqual(["CANCELLED", "RETURNED_TO_ORIGIN"]);
  });
});
