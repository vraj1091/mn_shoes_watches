import "server-only";
import { istDateKey } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/money";
import type { CouponDefaults } from "@/components/admin/coupon-fields";

type Discount = {
  code: string | null;
  title: string;
  publicLabel: string | null;
  type: string;
  value: number;
  maxDiscount: number | null;
  minOrderValue: number | null;
  usageLimit: number | null;
  startsAt: Date;
  endsAt: Date | null;
  isActive: boolean;
};

const rupees = (paise: number | null) => (paise === null ? "" : paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));

/** "10% off, up to ₹1,000 · min ₹2,999" for the coupon list. */
export function describeCoupon(discount: Discount): string {
  const main =
    discount.type === "PERCENT"
      ? `${discount.value / 100}% off${discount.maxDiscount ? `, up to ${formatPrice(discount.maxDiscount)}` : ""}`
      : discount.type === "FLAT"
        ? `${formatPrice(discount.value)} off`
        : discount.type === "FREE_SHIPPING"
          ? "Free delivery"
          : "Offer";
  return discount.minOrderValue ? `${main} · orders from ${formatPrice(discount.minOrderValue)}` : main;
}

/** Whether a coupon works right now, and if not, why. */
export function couponState(discount: Discount & { usageCount: number }, now = new Date()): { label: string; tone: "good" | "neutral" | "bad" } {
  if (!discount.isActive) return { label: "Off", tone: "neutral" };
  if (discount.startsAt > now) return { label: "Scheduled", tone: "neutral" };
  if (discount.endsAt && discount.endsAt <= now) return { label: "Ended", tone: "bad" };
  if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) return { label: "Used up", tone: "bad" };
  return { label: "Live", tone: "good" };
}

export function couponDefaults(discount?: Discount): CouponDefaults {
  if (!discount) {
    return { code: "", title: "", publicLabel: "", type: "PERCENT", value: "", maxDiscount: "", minOrderValue: "", usageLimit: "", startsAt: istDateKey(new Date()), endsAt: "", isActive: true };
  }
  return {
    code: discount.code ?? "",
    title: discount.title,
    publicLabel: discount.publicLabel ?? "",
    type: discount.type === "FLAT" || discount.type === "FREE_SHIPPING" ? discount.type : "PERCENT",
    value: discount.type === "PERCENT" ? String(discount.value / 100) : discount.type === "FLAT" ? rupees(discount.value) : "",
    maxDiscount: rupees(discount.maxDiscount),
    minOrderValue: rupees(discount.minOrderValue),
    usageLimit: discount.usageLimit === null ? "" : String(discount.usageLimit),
    startsAt: istDateKey(discount.startsAt),
    endsAt: discount.endsAt ? istDateKey(discount.endsAt) : "",
    isActive: discount.isActive,
  };
}
