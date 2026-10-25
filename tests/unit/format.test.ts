import { describe, expect, it } from "vitest";
import { formatPrice, formatPriceExact, parseRupees, percentOff } from "@/lib/format/money";
import { formatDate, formatDateTime, istDateKey, istHour } from "@/lib/format/date";
import { describeOpeningHours, openingHoursSchema, openingHoursSpecification } from "@/lib/format/hours";
import { formatIndianMobile, normaliseIndianMobile } from "@/lib/format/phone";
import { fill } from "@/lib/format/template";

describe("money", () => {
  it("formats whole rupees with Indian digit grouping", () => {
    expect(formatPrice(4_499_00)).toBe("₹4,499");
    expect(formatPrice(1_24_999_00)).toBe("₹1,24,999");
    expect(formatPrice(0)).toBe("₹0");
  });

  it("shows paise only when there are some", () => {
    expect(formatPrice(2_499_50)).toBe("₹2,499.50");
    expect(formatPriceExact(2_499_00)).toBe("₹2,499.00");
  });

  it("refuses fractional paise, which would mean a float slipped in", () => {
    expect(() => formatPrice(10.5)).toThrow(TypeError);
  });

  it("parses what the owner types in the admin", () => {
    expect(parseRupees("2499")).toBe(2_499_00);
    expect(parseRupees("2,499.5")).toBe(2_499_50);
    expect(parseRupees("₹ 1,24,999.99")).toBe(1_24_999_99);
    expect(parseRupees("12.345")).toBeNull();
    expect(parseRupees("abc")).toBeNull();
    expect(parseRupees("")).toBeNull();
  });

  it("rounds the discount badge down so it never overstates the saving", () => {
    expect(percentOff(4_499_00, 5_499_00)).toBe(18); // 18.18…
    expect(percentOff(5_000_00, 5_000_00)).toBe(0);
    expect(percentOff(5_000_00, null)).toBe(0);
    expect(percentOff(6_000_00, 5_000_00)).toBe(0);
  });
});

describe("dates in IST", () => {
  // 25 Oct 2026, 20:00 UTC is 26 Oct 2026, 01:30 in India.
  const lateUtc = new Date("2026-10-25T20:00:00Z");

  it("shows the Indian calendar date, not the server's", () => {
    expect(istDateKey(lateUtc)).toBe("2026-10-26");
    expect(formatDate(lateUtc)).toBe("26 Oct 2026");
    expect(istHour(lateUtc)).toBe(1);
  });

  it("formats date and time with am/pm", () => {
    expect(formatDateTime(new Date("2026-10-25T09:35:00Z")).toLowerCase()).toContain("3:05 pm");
  });
});

describe("opening hours", () => {
  it("describes consecutive days as a range", () => {
    expect(describeOpeningHours([{ days: ["Mo", "Tu", "We", "Th", "Fr", "Sa"], opens: "10:00", closes: "21:00" }])).toEqual([
      "Mon–Sat 10 am–9 pm",
    ]);
  });

  it("lists days that are not consecutive", () => {
    expect(describeOpeningHours([{ days: ["Su", "We"], opens: "11:30", closes: "14:00" }])).toEqual(["Wed, Sun 11:30 am–2 pm"]);
  });

  it("rejects malformed times", () => {
    expect(openingHoursSchema.safeParse([{ days: ["Mo"], opens: "10am", closes: "9pm" }]).success).toBe(false);
  });

  it("produces schema.org opening hours", () => {
    expect(openingHoursSpecification([{ days: ["Sa", "Su"], opens: "10:00", closes: "20:00" }])).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday"], opens: "10:00", closes: "20:00" },
    ]);
  });
});

describe("Indian mobile numbers", () => {
  it.each([
    ["98765 43210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["09876543210", "+919876543210"],
  ])("normalises %s", (input, expected) => {
    expect(normaliseIndianMobile(input)).toBe(expected);
  });

  it.each(["12345 67890", "98765", "+1 415 555 0100", ""])("rejects %s", (input) => {
    expect(normaliseIndianMobile(input)).toBeNull();
  });

  it("formats for display", () => {
    expect(formatIndianMobile("+919876543210")).toBe("+91 98765 43210");
  });
});

describe("message templates", () => {
  it("fills placeholders and leaves unknown ones alone", () => {
    expect(fill("Call {phone} or {other}", { phone: "+91 98765 43210" })).toBe("Call +91 98765 43210 or {other}");
  });
});
