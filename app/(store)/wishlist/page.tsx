import type { Metadata } from "next";
import { wishlistIds } from "@/lib/cart/wishlist";
import { toCards } from "@/lib/catalog/cards";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { readShopperHash } from "@/lib/shopper/token";
import { t } from "@/lib/i18n";
import { cardLabels, GRID } from "@/components/store/catalog/listing-view";
import { WishlistGrid } from "@/components/store/shop/wishlist-grid";

export const metadata: Metadata = { title: t("wishlist.title"), robots: { index: false, follow: true } };

export default async function WishlistPage() {
  const [ids, index] = await Promise.all([readShopperHash().then(wishlistIds), getCatalogIndex()]);
  const byId = new Map(index.products.map((product) => [product.id, product]));
  const products = ids.map((id) => byId.get(id)).filter((product) => product !== undefined);
  const cards = toCards(products, index.lowStockThreshold);
  return (
    <div className="mx-auto max-w-screen-xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl lg:text-5xl">{t("wishlist.title")}</h1>
      <p className="mt-3 text-base text-muted">
        {cards.length > 0 && <span className="font-medium text-ink">{cards.length === 1 ? t("wishlist.countOne") : t("wishlist.count", { count: cards.length })}. </span>}
        {t("wishlist.intro")}
      </p>
      <WishlistGrid cards={cards} labels={cardLabels()} empty={t("wishlist.empty")} grid={GRID} />
    </div>
  );
}
