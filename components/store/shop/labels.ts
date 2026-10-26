import "server-only";
import { t } from "@/lib/i18n";
import type { BagLabels } from "./cart-parts";
import type { WishlistLabels } from "./wishlist-button";

/** Strings for the client-side bag components, read on the server so message files stay off the browser. */
export function bagLabels(): BagLabels {
  const keys = [
    "title", "titleWithCount", "empty", "emptyHint", "startShopping", "remove", "removeItem", "quantity", "decrease", "increase",
    "unavailable", "priceChanged", "subtotal", "discount", "delivery", "free", "codFee", "total", "inclGst", "freeDeliveryLeft",
    "freeDeliveryDone", "viewBag", "checkout", "continueShopping", "couponLabel", "couponApply", "couponRemove", "couponApplied",
    "couponInvalid", "couponMinOrder", "couponBusy", "added", "soldOut", "limit", "busy",
  ] as const;
  return { ...Object.fromEntries(keys.map((key) => [key, t(`bag.${key}`)])), close: t("common.close") } as BagLabels;
}

export const wishlistLabels = (): WishlistLabels => ({ add: t("wishlist.add"), remove: t("wishlist.remove") });
