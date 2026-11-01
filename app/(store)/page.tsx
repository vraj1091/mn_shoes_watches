import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { getBrands, getPosts } from "@/lib/data/content";
import { getHeroBanners } from "@/lib/data/home";
import { getCategoryNavigation } from "@/lib/data/navigation";
import { getFeaturedReviews } from "@/lib/data/reviews";
import { getPrimaryLocation, getStoreSettings } from "@/lib/data/store";
import { toCards } from "@/lib/catalog/cards";
import { descendantIds, productsInCategories, sortProducts } from "@/lib/catalog/query";
import type { CatalogIndex, IndexedProduct } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import { ArrowLeftIcon, ArrowRightIcon, ReturnIcon, ShieldIcon, StoreIcon, TruckIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { ProductRow } from "@/components/store/catalog/product-row";
import { HeroCarousel } from "@/components/store/home/hero-carousel";
import { PostCard } from "@/components/store/post-card";
import { SectionHeading } from "@/components/store/section-heading";
import { Stars } from "@/components/store/product/reviews";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, location] = await Promise.all([getStoreSettings(), getPrimaryLocation()]);
  const where = location ? ` in ${location.city}` : "";
  return {
    title: { absolute: `${settings.storeName}: ${t("home.title")}${where}` },
    description: `${t("home.title")} from ${settings.storeName}${where}. Prices include GST.${settings.codEnabled ? " Cash on delivery available." : ""}`,
    alternates: { canonical: "/" },
  };
}

/** The best-selling product with a real photo in a set, for category and split tiles. */
function showcase(products: IndexedProduct[]): IndexedProduct | null {
  return sortProducts(products.filter((product) => product.image && !product.isPlaceholderPhoto), "bestselling")[0] ?? null;
}

function inCategory(index: CatalogIndex, path: string) {
  const category = index.categories.find((node) => node.path === path);
  return category ? productsInCategories(index.products, descendantIds(index.categories, category.id)) : [];
}

export default async function HomePage() {
  const [settings, departments, index, banners, brands, reviews, posts] = await Promise.all([
    getStoreSettings(),
    getCategoryNavigation(),
    getCatalogIndex(),
    getHeroBanners(),
    getBrands(),
    getFeaturedReviews(),
    getPosts(),
  ]);

  const newest = toCards(sortProducts(index.products, "newest").slice(0, 8), index.lowStockThreshold);
  const bestsellers = toCards(sortProducts(index.products, "bestselling").slice(0, 8), index.lowStockThreshold);
  const forHim = showcase(inCategory(index, "watches/men"));
  const forHer = showcase(inCategory(index, "watches/women"));
  const featuredBrands = brands.filter((brand) => brand.featured);

  const trust = [
    settings.codEnabled && { icon: <StoreIcon size={24} />, title: t("home.trustCod"), note: t("home.trustCodNote") },
    settings.freeShippingThreshold !== null && {
      icon: <TruckIcon size={24} />,
      title: t("home.trustDelivery", { amount: formatPrice(settings.freeShippingThreshold) }),
      note: t("home.trustDeliveryNote"),
    },
    settings.exchangesEnabled && { icon: <ReturnIcon size={24} />, title: t("home.trustExchange", { days: settings.returnWindowDays }), note: t("home.trustExchangeNote") },
    { icon: <ShieldIcon size={24} />, title: t("home.trustWarranty"), note: t("home.trustWarrantyNote") },
  ].filter((item) => item !== false);

  const slides = banners.map((banner, position) => {
    const Heading = position === 0 ? "h1" : "h2";
    return (
      <div key={banner.id} className="mx-auto grid max-w-screen-xl items-center gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pt-10">
        <div className="order-2 lg:order-1 lg:col-span-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{settings.storeName}</p>
          <Heading className="mt-3 font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">{banner.title}</Heading>
          {banner.subtitle && <p className="measure mt-4 text-lg text-muted">{banner.subtitle}</p>}
          {banner.ctaHref && banner.ctaLabel && (
            <ButtonLink href={banner.ctaHref} className="mt-6">
              {banner.ctaLabel}
              <ArrowRightIcon size={18} />
            </ButtonLink>
          )}
        </div>
        <div className="photo-tile relative order-1 aspect-[4/3] overflow-hidden rounded-md lg:order-2 lg:col-span-7 lg:aspect-[16/11]">
          {banner.image && (
            <Image
              src={banner.image.url}
              alt={banner.image.alt}
              fill
              sizes="(min-width: 1024px) 700px, 92vw"
              preload={position === 0}
              placeholder={banner.image.blurDataUrl ? "blur" : "empty"}
              blurDataURL={banner.image.blurDataUrl ?? undefined}
              className="object-contain p-[6%]"
            />
          )}
        </div>
      </div>
    );
  });

  return (
    <>
      {slides.length > 0 ? (
        <HeroCarousel
          slides={slides}
          labels={{ previous: t("home.heroPrevious"), next: t("home.heroNext"), slide: t("home.heroSlide") }}
          icons={{ previous: <ArrowLeftIcon size={20} />, next: <ArrowRightIcon size={20} /> }}
        />
      ) : (
        <section className="mx-auto max-w-screen-xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-16">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl">{t("home.title")}</h1>
        </section>
      )}

      <section aria-label={t("home.promiseGst")} className="mt-10 border-y border-line bg-surface">
        <ul className="mx-auto grid max-w-screen-xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8">
          {trust.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-muted">{item.icon}</span>
              <span>
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="block text-sm text-muted">{item.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        {departments.length > 0 && (
          <section aria-labelledby="shop-by-category" className="mt-16">
            <SectionHeading id="shop-by-category" title={t("home.shopByCategory")} />
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {departments.map((department) => {
                const products = inCategory(index, department.href.slice(1));
                const product = showcase(products);
                return (
                  <li key={department.id}>
                    <Link href={department.href} className="group block">
                      <span className="photo-tile relative block aspect-square overflow-hidden rounded-md">
                        {product?.image && (
                          <Image src={product.image.url} alt="" fill sizes="(min-width: 1024px) 300px, 46vw" className="object-contain p-[10%] transition-transform duration-200 ease-out group-hover:scale-[1.03]" />
                        )}
                      </span>
                      <span className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-lg font-semibold group-hover:text-accent">{department.name}</span>
                        <ArrowRightIcon size={18} className="shrink-0 transition-transform duration-150 group-hover:translate-x-1" />
                      </span>
                      <span className="block text-sm text-muted">{products.length === 1 ? t("home.categoryCountOne") : t("home.categoryCount", { count: products.length })}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <ProductRow id="new-arrivals" title={t("home.newArrivals")} products={newest} link={{ href: "/collections/new-arrivals", label: t("home.viewAll") }} />

        {forHim && forHer && (
          <section aria-label={`${t("home.forHim")}, ${t("home.forHer")}`} className="mt-16 grid gap-4 md:grid-cols-2">
            {[
              { product: forHim, title: t("home.forHim"), href: "/watches/men", count: inCategory(index, "watches/men").length },
              { product: forHer, title: t("home.forHer"), href: "/watches/women", count: inCategory(index, "watches/women").length },
            ].map((tile) => (
              // Words and photo get their own columns, so the photo never runs through the heading on a phone.
              <Link key={tile.href} href={tile.href} className="group photo-tile grid grid-cols-2 items-end gap-4 overflow-hidden rounded-md p-6 sm:p-8">
                <span className="text-ink">
                  <span className="block font-display text-3xl leading-tight sm:text-4xl">{tile.title}</span>
                  <span className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">
                    {tile.count === 1 ? t("home.seeWatchesOne") : t("home.seeWatches", { count: tile.count })}
                    <ArrowRightIcon size={16} />
                  </span>
                </span>
                <span className="relative aspect-square">
                  {tile.product.image && (
                    <Image src={tile.product.image.url} alt="" fill sizes="(min-width: 768px) 22vw, 44vw" className="object-contain transition-transform duration-200 ease-out group-hover:scale-[1.03]" />
                  )}
                </span>
              </Link>
            ))}
          </section>
        )}

        <ProductRow id="bestsellers" title={t("home.bestsellers")} products={bestsellers} link={{ href: "/collections/bestsellers", label: t("home.viewAll") }} />

        {featuredBrands.length > 0 && (
          <section aria-labelledby="brand-strip" className="mt-16">
            <SectionHeading id="brand-strip" title={t("home.brandStrip")} link={{ href: "/brands", label: t("home.allBrands") }} />
            {/* A stockist list, not a wall of logo boxes. */}
            <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-1">
              {featuredBrands.map((brand) => (
                <li key={brand.slug}>
                  <Link href={`/brands/${brand.slug}`} className="inline-flex min-h-11 items-center text-base font-medium tracking-[0.12em] text-ink uppercase decoration-accent decoration-2 underline-offset-8 hover:underline">
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {reviews.length > 0 && (
          <section aria-labelledby="home-reviews" className="mt-16">
            <SectionHeading id="home-reviews" title={t("home.reviews")} />
            <ul className="mt-8 grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
              {reviews.map((review) => (
                <li key={review.id} className="flex flex-col py-6 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0">
                  <Stars rating={review.rating} />
                  <span className="sr-only">{t("product.reviewsAverage", { rating: review.rating })}</span>
                  <blockquote className="mt-4 flex-1 text-lg">“{review.body}”</blockquote>
                  <p className="mt-5 text-sm">
                    <span className="font-semibold">{review.authorName}</span>{" "}
                    <Link href={`/product/${review.product.slug}`} className="text-muted underline underline-offset-2 hover:text-accent">
                      {t("home.reviewOf", { product: review.product.title })}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {posts.length > 0 && (
          <section aria-labelledby="home-journal" className="mt-16">
            <SectionHeading id="home-journal" title={t("home.journal")} link={{ href: "/journal", label: t("home.viewAll") }} />
            <ul className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.slice(0, 3).map((post) => (
                <li key={post.slug}>
                  <PostCard post={post} headingLevel={3} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

    </>
  );
}
