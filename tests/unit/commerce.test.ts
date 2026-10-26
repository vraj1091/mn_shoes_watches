import { describe, expect, it } from "vitest";
import { estimateDelivery, zoneFor, type ZoneRule } from "@/lib/commerce/delivery";
import { gstHeads, rateForUnitPrice, splitInclusive } from "@/lib/commerce/gst";
import { isValidPin, stateCodeForPin, STATES } from "@/lib/commerce/india";
import { allocate, computeTotals, type PricedLine } from "@/lib/commerce/totals";

const FOOTWEAR = [
  { maxUnitValue: 2_500_00, rateBp: 500 },
  { maxUnitValue: null, rateBp: 1800 },
];

describe("GST", () => {
  it("picks the footwear slab by the taxable value of one unit", () => {
    expect(rateForUnitPrice(1_299_00, FOOTWEAR)).toBe(500); // ₹1,237 taxable
    expect(rateForUnitPrice(2_625_00, FOOTWEAR)).toBe(500); // exactly ₹2,500 taxable
    expect(rateForUnitPrice(2_626_00, FOOTWEAR)).toBe(1800);
    expect(rateForUnitPrice(9_999_00, [])).toBe(1800);
  });

  it("takes GST out of an inclusive price and splits it for the invoice", () => {
    expect(splitInclusive(1_180_00, 1800)).toEqual({ taxable: 1_000_00, tax: 180_00 });
    expect(gstHeads(180_01, true)).toEqual({ cgst: 90_00, sgst: 90_01, igst: 0 });
    expect(gstHeads(180_00, false)).toEqual({ cgst: 0, sgst: 0, igst: 180_00 });
  });
});

describe("order totals", () => {
  const line = (key: string, unitPrice: number, quantity = 1, rateBp = 1800): PricedLine => ({ key, unitPrice, quantity, rateBp });
  const base = { coupon: null, freeShippingThreshold: 1_999_00, shippingRate: 99_00, paymentMethod: null, codFee: 49_00 } as const;

  it("charges delivery below the threshold and nothing above it", () => {
    expect(computeTotals({ ...base, lines: [line("a", 999_00)] })).toMatchObject({ shippingTotal: 99_00, grandTotal: 1_098_00, freeShippingRemaining: 1_000_00 });
    expect(computeTotals({ ...base, lines: [line("a", 1_999_00)] })).toMatchObject({ shippingTotal: 0, freeShippingRemaining: 0 });
  });

  it("applies WELCOME10 above ₹999 and FLAT500 above ₹4,999, and says why not otherwise", () => {
    const welcome = { code: "WELCOME10", type: "PERCENT", value: 1000, minOrderValue: 999_00, maxDiscount: null } as const;
    const flat = { code: "FLAT500", type: "FLAT", value: 500_00, minOrderValue: 4_999_00, maxDiscount: null } as const;
    expect(computeTotals({ ...base, coupon: welcome, lines: [line("a", 2_000_00)] }).discountTotal).toBe(200_00);
    expect(computeTotals({ ...base, coupon: welcome, lines: [line("a", 500_00)] })).toMatchObject({ discountTotal: 0, couponProblem: "MIN_ORDER" });
    const flatTotals = computeTotals({ ...base, coupon: flat, lines: [line("a", 3_000_00), line("b", 2_000_00)] });
    expect(flatTotals.discountTotal).toBe(500_00);
    expect(flatTotals.lines.map((entry) => entry.discount)).toEqual([300_00, 200_00]);
  });

  it("adds the COD fee only for cash on delivery, with GST counted inside fees", () => {
    const cod = computeTotals({ ...base, paymentMethod: "COD", lines: [line("a", 1_180_00)] });
    expect(cod).toMatchObject({ codFee: 49_00, shippingTotal: 99_00, grandTotal: 1_328_00 });
    expect(cod.taxTotal).toBe(180_00 + splitInclusive(148_00, 1800).tax);
  });

  it("spreads a discount without losing a paisa", () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(0, [5, 5])).toEqual([0, 0]);
  });
});

describe("PIN codes and delivery dates", () => {
  const zones: ZoneRule[] = [
    { name: "Kalol and Gandhinagar", stateCodes: ["24"], pinPrefixes: ["3827", "3820"], minDays: 1, maxDays: 1, price: 99_00, codAvailable: true },
    { name: "Gujarat", stateCodes: ["24"], pinPrefixes: null, minDays: 1, maxDays: 2, price: 99_00, codAvailable: true },
    { name: "Rest of India", stateCodes: [], pinPrefixes: null, minDays: 3, maxDays: 6, price: 99_00, codAvailable: true },
  ];
  const rules = { cutoffHour: 14, holidays: ["2026-11-09"] };

  it("validates PIN codes and finds the state", () => {
    expect(isValidPin("382721")).toBe(true);
    expect(isValidPin("082721")).toBe(false);
    expect(isValidPin("38272")).toBe(false);
    expect(stateCodeForPin("382721")).toBe("24");
    expect(stateCodeForPin("400050")).toBe("27");
    expect(stateCodeForPin("403001")).toBe("30"); // Goa inside the Maharashtra circle
    expect(stateCodeForPin("560038")).toBe("29");
    expect(STATES.find((state) => state.code === "24")?.name).toBe("Gujarat");
  });

  it("matches PIN-prefix zones before state zones before the catch-all", () => {
    expect(zoneFor("382721", zones)?.name).toBe("Kalol and Gandhinagar");
    expect(zoneFor("380015", zones)?.name).toBe("Gujarat");
    expect(zoneFor("560038", zones)?.name).toBe("Rest of India");
  });

  it("dispatches the same day before 2 pm IST and skips Sundays and holidays", () => {
    // Friday 6 Nov 2026, 10:00 IST
    const friday = new Date("2026-11-06T04:30:00Z");
    const local = estimateDelivery("382721", friday, zones, rules)!;
    expect(local.dispatchDate.toISOString().slice(0, 10)).toBe("2026-11-06");
    expect(local.minDate.toISOString().slice(0, 10)).toBe("2026-11-07"); // Saturday
    // Saturday 7 Nov, 16:00 IST: past the cut-off; Sunday is skipped, Monday 9 Nov is a holiday.
    const late = estimateDelivery("560038", new Date("2026-11-07T10:30:00Z"), zones, rules)!;
    expect(late.dispatchDate.toISOString().slice(0, 10)).toBe("2026-11-10");
    expect(late.minDate.toISOString().slice(0, 10)).toBe("2026-11-13");
  });

  it("adds two days for remote states and refuses invalid PINs", () => {
    const friday = new Date("2026-11-06T04:30:00Z");
    const guwahati = estimateDelivery("781001", friday, zones, rules)!;
    const bengaluru = estimateDelivery("560038", friday, zones, rules)!;
    expect(guwahati.maxDate.getTime()).toBeGreaterThan(bengaluru.maxDate.getTime());
    expect(estimateDelivery("12345", friday, zones, rules)).toBeNull();
  });
});
