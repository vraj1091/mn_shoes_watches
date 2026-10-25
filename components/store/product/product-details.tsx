import { describeWaterResistance, formatNumberSpec, WRIST_WIDTH_MM } from "@/lib/catalog/specs";
import { t } from "@/lib/i18n";
import type { ProductPageData } from "@/lib/data/catalog";

type Attributes = ProductPageData["attributes"];

/** The size chart table and "how to measure", shown inside the size guide dialog. */
export function SizeChartTable({ chart }: { chart: NonNullable<ProductPageData["sizeChart"]> }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">{chart.name}</caption>
          <thead>
            <tr>
              {chart.table.columns.map((column) => (
                <th key={column} scope="col" className="border-b border-line-strong px-3 py-2 text-left font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.table.rows.map((row) => (
              <tr key={row.join("|")} className="border-b border-line">
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-3 py-2 text-left font-medium">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="px-3 py-2">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chart.howToMeasureHtml && (
        <section className="mt-6">
          <h3 className="text-base font-semibold">{t("product.howToMeasure")}</h3>
          <div className="rich-text mt-2 text-sm" dangerouslySetInnerHTML={{ __html: chart.howToMeasureHtml }} />
        </section>
      )}
    </>
  );
}

export function SpecsTable({ specs }: { specs: ProductPageData["specs"] }) {
  if (specs.length === 0) return null;
  return (
    <section aria-labelledby="specs-heading">
      <h2 id="specs-heading" className="text-xl font-semibold">
        {t("product.specs")}
      </h2>
      <dl className="mt-4 border-t border-line">
        {specs.map((spec) => (
          <div key={spec.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 border-b border-line py-3 text-sm">
            <dt className="text-muted">{spec.label}</dt>
            <dd className="text-ink">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Dial drawn to scale against a 16–17 cm wrist (Part 4: "dial-size visual on a wrist outline"), and
 * what the water-resistance rating means in practice. Movement and the raw rating stay in the specs table.
 */
export function WatchFacts({ attributes }: { attributes: Attributes }) {
  const dial = attributes.dial_size_mm?.number ?? null;
  const water = attributes.water_resistance_m?.number ?? null;
  if (dial === null && water === null) return null;

  const scale = 3; // SVG units per millimetre
  const width = 120 * scale;
  const wrist = WRIST_WIDTH_MM * scale;
  const height = wrist + 24 * scale;
  const centerY = height / 2;

  return (
    <section aria-labelledby="watch-heading" className="space-y-6">
      {dial !== null && (
        <figure>
          <h2 id="watch-heading" className="text-xl font-semibold">
            {t("product.dialTitle", { size: formatNumberSpec(dial, "mm") })}
          </h2>
          <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full max-w-sm" role="img" aria-label={t("product.dialTitle", { size: formatNumberSpec(dial, "mm") })}>
            <rect x="0" y={centerY - wrist / 2} width={width} height={wrist} rx={wrist / 2.4} className="fill-surface stroke-line-strong" strokeWidth="2" />
            <rect x={width / 2 - (dial * scale) / 2.6} y={centerY - wrist / 2 - 8} width={(dial * scale) / 1.3} height={wrist + 16} rx="6" className="fill-line" />
            <circle cx={width / 2} cy={centerY} r={(dial * scale) / 2} className="fill-canvas stroke-ink" strokeWidth="3" />
            <line x1={width / 2} y1={centerY} x2={width / 2} y2={centerY - (dial * scale) / 2.8} className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
            <line x1={width / 2} y1={centerY} x2={width / 2 + (dial * scale) / 3.4} y2={centerY} className="stroke-accent" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <figcaption className="mt-2 text-sm text-muted">{t("product.dialCaption")}</figcaption>
        </figure>
      )}
      {water !== null && (
        <div className="text-sm">
          <h3 className="font-semibold">{t("product.waterResistance")}</h3>
          <p className="text-muted">{describeWaterResistance(water)}</p>
        </div>
      )}
    </section>
  );
}

/** Top, heart and base notes as a pyramid. Longevity and concentration stay in the specs table. */
export function PerfumeNotes({ attributes }: { attributes: Attributes }) {
  const tiers = [
    { key: "top_notes", label: t("product.notesTop"), hint: t("product.notesTopHint"), width: "w-3/5" },
    { key: "heart_notes", label: t("product.notesHeart"), hint: t("product.notesHeartHint"), width: "w-4/5" },
    { key: "base_notes", label: t("product.notesBase"), hint: t("product.notesBaseHint"), width: "w-full" },
  ].filter((tier) => (attributes[tier.key]?.labels.length ?? 0) > 0);
  if (tiers.length === 0) return null;

  return (
    <section aria-labelledby="notes-heading">
      <h2 id="notes-heading" className="text-xl font-semibold">
        {t("product.notesTitle")}
      </h2>
      <ol className="mt-4 flex flex-col items-center gap-2">
        {tiers.map((tier) => (
          <li key={tier.key} className={`${tier.width} rounded-md bg-surface px-4 py-3 text-center`}>
            <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
              {tier.label} <span className="font-normal tracking-normal normal-case">· {tier.hint}</span>
            </p>
            <p className="mt-1 text-base">{attributes[tier.key]!.labels.join(", ")}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Product photos. Zoom and per-colour switching arrive with photo uploads in Phase 4. */
export function ProductGallery({ title, images }: { title: string; images: ProductPageData["images"] }) {
  if (images.length === 0) {
    // No photo yet: a plain tile with the name, never a stock image (Part 3). Hidden from screen
    // readers, which already have the name from the heading.
    return (
      <div aria-hidden className="photo-tile flex aspect-[4/5] items-end rounded-md p-6 lg:p-10">
        <p className="text-2xl leading-tight font-semibold lg:text-4xl">{title}</p>
      </div>
    );
  }
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
      {images.map((image, i) => (
        <li key={image.url} className={`w-[86vw] shrink-0 snap-center sm:w-auto ${i === 0 ? "sm:col-span-2" : ""}`}>
          <img
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : undefined}
            decoding="async"
            className="aspect-[4/5] w-full rounded-md object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
