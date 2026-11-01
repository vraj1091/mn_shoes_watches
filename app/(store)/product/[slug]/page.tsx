import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { getProductBySlug, type ProductPageData } from "@/lib/data/catalog";
import { getProductReviews } from "@/lib/data/reviews";
import { getStoreSettings, type StoreSettings } from "@/lib/data/store";
import { toCards } from "@/lib/catalog/cards";
import { ancestors } from "@/lib/catalog/query";
import { pickProducts, similarProducts } from "@/lib/catalog/related";
import { initialSelection, isSizeOption, priceSummary } from "@/lib/catalog/variants";
import { videoEmbedUrl } from "@/lib/catalog/video";
import { formatPrice } from "@/lib/format/money";
import { describe } from "@/lib/seo/listing";
import { productLd } from "@/lib/seo/structured-data";
import { openGraph } from "@/lib/seo/open-graph";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CloseIcon, PlayIcon, ReturnIcon, RulerIcon, ShieldIcon, WarningIcon } from "@/components/icons";
import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import { FaqList } from "@/components/store/catalog/faq-list";
import { cardLabels } from "@/components/store/catalog/listing-view";
import { ProductRow } from "@/components/store/catalog/product-row";
import { BuyBox, type BuyBoxLabels } from "@/components/store/product/buy-box";
import { Gallery } from "@/components/store/product/gallery";
import { PinCheck } from "@/components/store/product/pin-check";
import { PerfumeNotes, SizeChartTable, SpecsTable, WatchFacts } from "@/components/store/product/product-details";
import { RecentlyViewed } from "@/components/store/product/recently-viewed";
import { ReviewsSection, Stars } from "@/components/store/product/reviews";
import { SizeGuide } from "@/components/store/product/size-guide";
import { WishlistButton } from "@/components/store/shop/wishlist-button";
import { wishlistLabels } from "@/components/store/shop/labels";
import { JsonLd } from "@/components/seo/json-ld";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Card EMI is offered by most Indian banks from ₹3,000 a transaction; below that the line would mislead. */
const EMI_FROM = 3_000_00;

async function load(params: Props["params"]) {
  const product = await getProductBySlug(decodeURIComponent((await params).slug));
  if (!product) notFound();
  if (product.kind === "archived") {
    // proxy.ts answers both cases before the page runs; this covers the moment between a save and its reload.
    if (product.replacementSlug) permanentRedirect(`/product/${product.replacementSlug}`);
    notFound();
  }
  return product;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [product, settings] = await Promise.all([load(params), getStoreSettings()]);
  const name = product.brand ? `${product.brand.name} ${product.title}` : product.title;
  const description = product.metaDescription ?? describe(product.summary ?? product.highlights.join(". "));
  return {
    title: product.metaTitle ?? name,
    description,
    // Shared on WhatsApp or Instagram, the link shows the product photo rather than the shop's card.
    openGraph: openGraph(settings.storeName, {
      title: name,
      description,
      url: `/product/${product.slug}`,
      ...(product.images.length > 0 && !product.isPlaceholderPhoto ? { images: product.images.slice(0, 4).map((image) => ({ url: image.url, alt: image.alt })) } : {}),
    }),
    // ?variant= and tracking parameters all point at the one product URL.
    alternates: { canonical: `/product/${product.slug}` },
    ...(product.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = await load(params);
  const [index, settings, query, reviews] = await Promise.all([getCatalogIndex(), getStoreSettings(), searchParams, getProductReviews(product.id)]);
  const requested = typeof query.variant === "string" ? query.variant : null;

  const trail = product.primaryCategoryId ? ancestors(index.categories, product.primaryCategoryId) : [];
  const indexed = index.products.find((entry) => entry.id === product.id);
  const look = toCards(pickProducts(index, product.completeTheLookIds), index.lowStockThreshold);
  const similar = toCards(
    similarProducts(index, { id: product.id, primaryCategoryId: product.primaryCategoryId, price: priceSummary(product.variants).price }, new Set(product.completeTheLookIds)),
    index.lowStockThreshold,
  );
  const sizeChart = product.sizeChart;

  return (
    <div className="mx-auto max-w-screen-xl px-4 pt-4 pb-4 sm:px-6 lg:px-8 lg:pt-6">
      <JsonLd data={productLd(env().APP_URL, product, reviews.reviews, settings.storeName)} />
      <Breadcrumbs items={[...trail.map((node) => ({ name: node.name, href: `/${node.path}` })), { name: product.title, href: `/product/${product.slug}` }]} />

      {/* Two columns from tablet width, so name, price and "Add to bag" sit beside the photo, not a screen below it. */}
      <div className="mt-4 md:grid md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        {product.images.length > 0 ? (
          <Gallery
            images={product.images}
            videoEmbed={videoEmbedUrl(product.videoUrl)}
            labels={{
              viewer: t("product.galleryTitle", { title: product.title }),
              open: t("product.galleryOpen"),
              close: t("product.galleryClose"),
              previous: t("product.galleryPrevious"),
              next: t("product.galleryNext"),
              thumb: t("product.galleryThumb"),
              zoomHint: t("product.galleryZoomHint"),
              video: t("product.video"),
            }}
            icons={{ close: <CloseIcon size={22} />, previous: <ArrowLeftIcon size={20} />, next: <ArrowRightIcon size={20} />, play: <PlayIcon size={22} /> }}
          />
        ) : (
          <div aria-hidden className="photo-tile flex aspect-square items-end rounded-md p-6 lg:p-10">
            <p className="text-2xl leading-tight font-semibold lg:text-4xl">{product.title}</p>
          </div>
        )}

        <div className="mt-6 md:sticky md:top-20 md:mt-0 md:self-start xl:top-24">
          {product.brand && (
            <Link href={`/brands/${product.brand.slug}`} className="text-sm font-semibold tracking-wide text-muted uppercase hover:text-accent">
              {product.brand.name}
            </Link>
          )}
          <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight lg:text-3xl">{product.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            {product.ratingCount > 0 && (
              <a href="#reviews-heading" className="flex items-center gap-2 text-sm text-muted hover:text-accent">
                <Stars rating={product.ratingAvg} />
                <span className="price">
                  {product.ratingAvg.toFixed(1)} · {product.ratingCount === 1 ? t("product.reviewsCountOne") : t("product.reviewsCount", { count: product.ratingCount })}
                </span>
              </a>
            )}
            {product.badges.map((badge) => (
              <span key={badge} className="rounded-sm bg-badge px-2 py-0.5 text-xs font-semibold text-badge-ink">
                {badge}
              </span>
            ))}
          </div>
          {product.summary && <p className="mt-3 text-base text-muted">{product.summary}</p>}

          <BuyBox
            title={product.title}
            options={product.options}
            variants={product.variants}
            initial={initialSelection(product.variants, product.options, requested)}
            lowStockThreshold={index.lowStockThreshold}
            emiFrom={EMI_FROM}
            labels={buyBoxLabels()}
            stockIcons={{ inStock: <CheckIcon size={18} />, low: <WarningIcon size={18} /> }}
            wishlist={<WishlistButton productId={product.id} title={product.title} labels={wishlistLabels()} size="page" />}
            delivery={
              <PinCheck
                labels={{
                  title: t("product.pinTitle"),
                  label: t("product.pinLabel"),
                  check: t("product.pinCheck"),
                  invalid: t("product.pinInvalid"),
                  unserviceable: t("product.pinUnserviceable"),
                  result: t("product.pinResult"),
                  cod: t("product.pinCod"),
                  noCod: t("product.pinNoCod"),
                  free: t("product.pinFree"),
                  busy: t("bag.busy"),
                }}
              />
            }
            sizeGuide={
              sizeChart ? (
                <SizeGuide
                  label={t("product.sizeGuide")}
                  title={sizeChart.name}
                  closeLabel={t("common.close")}
                  closeIcon={<CloseIcon size={22} />}
                  icon={<RulerIcon size={18} />}
                >
                  <SizeChartTable chart={sizeChart} />
                </SizeGuide>
              ) : undefined
            }
          />

          {product.highlights.length > 0 && (
            <section aria-labelledby="highlights-heading" className="mt-8">
              <h2 id="highlights-heading" className="text-sm font-semibold">
                {t("product.highlights")}
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base marker:text-muted">
                {product.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </section>
          )}

          <ServiceFacts product={product} settings={settings} />
        </div>
      </div>

      <div className="mt-16 grid gap-12 border-t border-line pt-12 lg:grid-cols-2 lg:gap-16">
        {product.descriptionHtml && (
          <section aria-labelledby="description-heading" className="measure">
            <h2 id="description-heading" className="text-xl font-semibold">
              {t("product.description")}
            </h2>
            {/* Sanitised when saved in the admin. */}
            <div className="rich-text mt-4" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
          </section>
        )}
        <SpecsTable specs={product.specs} />
        <WatchFacts attributes={product.attributes} />
        <PerfumeNotes attributes={product.attributes} />
        {(product.care || product.warranty) && (
          <section aria-labelledby="care-heading" className="measure space-y-6">
            {product.care && (
              <div>
                <h2 id="care-heading" className="text-xl font-semibold">
                  {t("product.care")}
                </h2>
                <p className="mt-3 text-base">{product.care}</p>
              </div>
            )}
            {product.warranty && (
              <div>
                <h2 className="text-xl font-semibold">{t("product.warranty")}</h2>
                <p className="mt-3 text-base">{product.warranty}</p>
              </div>
            )}
          </section>
        )}
        <FaqList title={t("product.faqTitle")} faqs={product.faqs} />
      </div>

      <ReviewsSection data={reviews} />

      <ProductRow id="complete-the-look" title={t("product.completeTheLook")} products={look} />
      <ProductRow id="similar-products" title={t("product.similar")} products={similar} />
      {indexed && <RecentlyViewed current={toCards([indexed], index.lowStockThreshold)[0]!} title={t("product.recentlyViewed")} labels={cardLabels()} />}
    </div>
  );
}

/** "5-year warranty" when the months make whole years of two or more; otherwise months. */
function warrantyLine(months: number) {
  if (months === 12) return t("product.warrantyYear");
  if (months >= 24 && months % 12 === 0) return t("product.warrantyYears", { years: months / 12 });
  return t("product.warrantyMonths", { months });
}

/** Returns and warranty in two short lines beside the price, with the full policy one tap away. */
function ServiceFacts({ product, settings }: { product: ProductPageData; settings: StoreSettings }) {
  const days = settings.returnWindowDays;
  const returns = [
    settings.exchangesEnabled && product.options.some(isSizeOption) ? t("product.returnsExchange", { days }) : null,
    settings.returnsEnabled ? t("product.returnsReturn", { days }) : null,
    settings.returnsEnabled || settings.exchangesEnabled
      ? settings.returnFeeType === "FREE" || settings.returnFee === 0
        ? t("product.returnsFree")
        : t("product.returnsFee", { fee: formatPrice(settings.returnFee) })
      : null,
  ].filter(Boolean);

  return (
    <ul className="mt-8 space-y-4 border-t border-line pt-6 text-sm">
      <li className="flex gap-3">
        <ReturnIcon size={20} className="mt-0.5 shrink-0 text-muted" />
        <div>
          <p className="font-semibold">{t("product.returnsTitle")}</p>
          <p className="text-muted">{returns.length > 0 ? returns.join(" ") : t("product.returnsNone")}</p>
          <Link href="/policies/returns-and-exchanges" className="inline-flex min-h-11 items-center text-link hover:text-accent underline underline-offset-4 hover:no-underline">
            {t("product.returnsPolicy")}
          </Link>
        </div>
      </li>
      {product.warrantyMonths ? (
        <li className="flex gap-3">
          <ShieldIcon size={20} className="mt-0.5 shrink-0 text-muted" />
          <p className="font-semibold">{warrantyLine(product.warrantyMonths)}</p>
        </li>
      ) : null}
    </ul>
  );
}

function buyBoxLabels(): BuyBoxLabels {
  return {
    inclTaxes: t("product.inclTaxes"),
    emi: t("product.emi"),
    chooseOption: t("product.chooseOption"),
    selectedValue: t("product.selectedValue"),
    soldOutValue: t("product.soldOutValue"),
    inStock: t("product.inStock"),
    onlyLeft: t("product.onlyLeft"),
    soldOut: t("product.soldOut"),
    sku: t("product.sku"),
    percentOff: t("catalog.percentOff"),
    originalPrice: t("catalog.originalPrice"),
    from: t("catalog.from"),
    notifyTitle: t("product.notifyTitle"),
    notifyIntro: t("product.notifyIntro"),
    notifyEmail: t("product.notifyEmail"),
    notifySubmit: t("product.notifySubmit"),
    notifyDone: t("product.notifyDone"),
    notifyInvalid: t("product.notifyInvalid"),
    notifyBusy: t("product.notifyBusy"),
    notifyError: t("product.notifyError"),
    addToBag: t("product.addToBag"),
    adding: t("product.adding"),
    buyNow: t("product.buyNow"),
    chooseFirst: t("product.chooseFirst"),
    added: t("bag.added"),
    soldOutNow: t("bag.soldOut"),
    limit: t("bag.limit"),
    busy: t("bag.busy"),
  };
}
