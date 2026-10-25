import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { getProductBySlug, type ProductPageData } from "@/lib/data/catalog";
import { getStoreSettings, type StoreSettings } from "@/lib/data/store";
import { toCards } from "@/lib/catalog/cards";
import { ancestors } from "@/lib/catalog/query";
import { pickProducts, similarProducts } from "@/lib/catalog/related";
import { initialSelection, isSizeOption, priceSummary } from "@/lib/catalog/variants";
import { formatPrice } from "@/lib/format/money";
import { describe } from "@/lib/seo/listing";
import { t } from "@/lib/i18n";
import { CloseIcon, ReturnIcon, RulerIcon, ShieldIcon } from "@/components/icons";
import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import { FaqList } from "@/components/store/catalog/faq-list";
import { cardLabels } from "@/components/store/catalog/listing-view";
import { ProductRow } from "@/components/store/catalog/product-row";
import { BuyBox, type BuyBoxLabels } from "@/components/store/product/buy-box";
import { PerfumeNotes, ProductGallery, SizeChartTable, SpecsTable, WatchFacts } from "@/components/store/product/product-details";
import { RecentlyViewed } from "@/components/store/product/recently-viewed";
import { SizeGuide } from "@/components/store/product/size-guide";

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
  const product = await load(params);
  return {
    title: product.metaTitle ?? product.title,
    description: product.metaDescription ?? describe(product.summary ?? product.highlights.join(". ")),
    // ?variant= and tracking parameters all point at the one product URL.
    alternates: { canonical: `/product/${product.slug}` },
    ...(product.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = await load(params);
  const [index, settings, query] = await Promise.all([getCatalogIndex(), getStoreSettings(), searchParams]);
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
      <Breadcrumbs items={[...trail.map((node) => ({ name: node.name, href: `/${node.path}` })), { name: product.title, href: `/product/${product.slug}` }]} />

      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <ProductGallery title={product.title} images={product.images} />

        <div className="mt-6 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
          <h1 className="font-display text-3xl leading-tight lg:text-4xl">{product.title}</h1>
          {product.summary && <p className="mt-3 text-base text-muted">{product.summary}</p>}

          <BuyBox
            options={product.options}
            variants={product.variants}
            initial={initialSelection(product.variants, product.options, requested)}
            lowStockThreshold={index.lowStockThreshold}
            emiFrom={EMI_FROM}
            labels={buyBoxLabels()}
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
            <h2 id="description-heading" className="font-display text-2xl">
              {t("product.description")}
            </h2>
            {/* Sanitised when saved in the admin (Phase 4). */}
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
                <h2 id="care-heading" className="font-display text-2xl">
                  {t("product.care")}
                </h2>
                <p className="mt-3 text-base">{product.care}</p>
              </div>
            )}
            {product.warranty && (
              <div>
                <h2 className="font-display text-2xl">{t("product.warranty")}</h2>
                <p className="mt-3 text-base">{product.warranty}</p>
              </div>
            )}
          </section>
        )}
        <FaqList title={t("product.faqTitle")} faqs={product.faqs} />
      </div>

      <ProductRow id="complete-the-look" title={t("product.completeTheLook")} products={look} />
      <ProductRow id="similar-products" title={t("product.similar")} products={similar} />
      {indexed && <RecentlyViewed current={toCards([indexed], index.lowStockThreshold)[0]!} title={t("product.recentlyViewed")} labels={cardLabels()} />}
    </div>
  );
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
          <Link href="/policies/returns-and-exchanges" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4 hover:no-underline">
            {t("product.returnsPolicy")}
          </Link>
        </div>
      </li>
      {product.warrantyMonths ? (
        <li className="flex gap-3">
          <ShieldIcon size={20} className="mt-0.5 shrink-0 text-muted" />
          <p className="font-semibold">{t("product.warrantyMonths", { months: product.warrantyMonths })}</p>
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
  };
}
