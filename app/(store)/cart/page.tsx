import type { Metadata } from "next";
import { buildCartView } from "@/lib/cart/cart";
import { readShopperHash } from "@/lib/shopper/token";
import { t } from "@/lib/i18n";
import { CartPageView } from "@/components/store/shop/cart-page";
import { bagLabels } from "@/components/store/shop/labels";

export const metadata: Metadata = { title: t("bag.title"), robots: { index: false, follow: true } };

export default async function CartPage() {
  const view = await buildCartView(await readShopperHash());
  return (
    <div className="mx-auto max-w-screen-xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl lg:text-5xl">{t("bag.title")}</h1>
      <CartPageView initial={view} labels={bagLabels()} />
    </div>
  );
}
