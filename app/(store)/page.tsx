import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryNavigation } from "@/lib/data/navigation";
import { getPrimaryLocation, getStoreSettings } from "@/lib/data/store";
import { describeOpeningHours } from "@/lib/format/hours";
import { formatPrice } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, location] = await Promise.all([getStoreSettings(), getPrimaryLocation()]);
  const where = location ? ` in ${location.city}` : "";
  return {
    title: { absolute: `${settings.storeName}: ${t("home.title")}${where}` },
    description: `${t("home.title")} from ${settings.storeName}${where}. Prices include GST.${
      settings.codEnabled ? " Cash on delivery available." : ""
    }`,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [settings, location, departments] = await Promise.all([
    getStoreSettings(),
    getPrimaryLocation(),
    getCategoryNavigation(),
  ]);

  const promises = [
    settings.codEnabled && t("home.promiseCod"),
    settings.exchangesEnabled && t("home.promiseExchange", { days: settings.returnWindowDays }),
    settings.freeShippingThreshold !== null &&
      t("home.promiseShipping", { amount: formatPrice(settings.freeShippingThreshold) }),
    t("home.promiseGst"),
  ].filter((line): line is string => Boolean(line));

  const [lead, ...rest] = departments;

  return (
    <>
      <section className="mx-auto grid max-w-screen-xl gap-10 px-4 pt-10 pb-14 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pt-20 lg:pb-24">
        <div className="lg:col-span-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{settings.storeName}</p>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl">{t("home.title")}</h1>
          <p className="measure mt-6 text-lg text-fg sm:text-xl">
            {location ? (
              <>
                {t("home.lineBefore")} <span className="scribble">{t("home.lineWord")}</span>{" "}
                {t("home.lineAfter", { city: location.city })}
              </>
            ) : (
              t("home.lineNoCity")
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {lead && (
              <ButtonLink href={lead.href}>
                {t("home.shopLead", { name: lead.name.toLowerCase() })}
                <ArrowRightIcon size={18} />
              </ButtonLink>
            )}
            {location && (
              <ButtonLink href="#visit" variant="secondary">
                {t("home.visitTitle")}
              </ButtonLink>
            )}
          </div>
        </div>
        <ul className="self-end border-t border-line lg:col-span-4 lg:border-t-0 lg:border-l lg:pl-8">
          {promises.map((line) => (
            <li key={line} className="flex items-start gap-3 border-b border-line py-3 text-base last:border-b-0">
              <CheckIcon size={20} className="mt-0.5 shrink-0 text-success" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      {departments.length > 0 && (
        <section aria-labelledby="shop-by-category" className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <h2 id="shop-by-category" className="font-display text-3xl lg:text-4xl">
            {t("home.shopByCategory")}
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[17rem] lg:grid-cols-4">
            {lead && (
              <li className="col-span-2 lg:row-span-2">
                <DepartmentTile name={lead.name} href={lead.href} count={lead.children.length} shape="lead" />
              </li>
            )}
            {rest.map((dept, index) => {
              const wide = index === rest.length - 1 && rest.length % 2 === 1;
              return (
                <li key={dept.id} className={wide ? "col-span-2" : ""}>
                  <DepartmentTile name={dept.name} href={dept.href} count={dept.children.length} shape={wide ? "wide" : "tile"} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {location && (
        <section id="visit" aria-labelledby="visit-heading" className="mx-auto mt-24 max-w-screen-xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* The owner's store photo goes here (Phase 6); until then a plain tile, never a stock image. */}
            <div className="flex aspect-[4/3] items-end rounded-md bg-subtle p-6 lg:col-span-7">
              <p className="font-display text-2xl text-muted">{location.name}</p>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <h2 id="visit-heading" className="font-display text-3xl lg:text-4xl">
                {t("home.visitHeading", { city: location.city })}
              </h2>
              <p className="mt-4 text-base text-muted">{t("home.visitIntro")}</p>
              <address className="mt-6 text-base not-italic">
                {[location.line1, location.line2, location.landmark].filter(Boolean).join(", ")}
                <br />
                {location.city}, {location.state} {location.pinCode}
              </address>
              <ul className="mt-4 text-sm text-muted tabular-nums">
                {describeOpeningHours(location.openingHours).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                {location.mapUrl && (
                  <ButtonLink href={location.mapUrl} target="_blank" rel="noopener noreferrer">
                    {t("home.directions")}
                  </ButtonLink>
                )}
                <ButtonLink href={`tel:${location.phone.replace(/\s/g, "")}`} variant="secondary">
                  {t("home.callUs")}
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// Phones and tablets size tiles by aspect ratio; desktop rows have a fixed height, so the tiles
// fill their grid cells instead of growing from their own height.
const TILE_SHAPES = {
  lead: "aspect-[4/3]",
  wide: "aspect-[2/1] sm:aspect-[8/3]",
  tile: "aspect-square sm:aspect-[4/3]",
} as const;

function DepartmentTile({ name, href, count, shape }: { name: string; href: string; count: number; shape: keyof typeof TILE_SHAPES }) {
  const large = shape === "lead";
  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between rounded-md bg-subtle p-5 transition-colors duration-200 hover:bg-accent-soft sm:p-6 lg:aspect-auto lg:h-full ${TILE_SHAPES[shape]}`}
    >
      <span className="text-sm text-muted">{t("home.subcategories", { count })}</span>
      <span className="flex items-end justify-between gap-3">
        <span className={`font-display ${large ? "text-4xl lg:text-5xl" : "text-2xl lg:text-3xl"}`}>{name}</span>
        <ArrowRightIcon size={22} className="mb-1 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
