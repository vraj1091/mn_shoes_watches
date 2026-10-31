import type { Metadata } from "next";
import Link from "next/link";
import { getBrands } from "@/lib/data/content";
import { t } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";

export const metadata: Metadata = { title: t("brands.title"), description: t("brands.intro"), alternates: { canonical: "/brands" } };

/** All brands A to Z, grouped by first letter. */
export default async function BrandsPage() {
  const brands = [...(await getBrands())].sort((a, b) => a.name.localeCompare(b.name));
  const groups = new Map<string, typeof brands>();
  for (const brand of brands) {
    const letter = brand.name[0]!.toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), brand]);
  }
  return (
    <div className="mx-auto max-w-screen-xl px-4 pt-6 pb-4 sm:px-6 lg:px-8 lg:pt-8">
      <Breadcrumbs items={[{ name: t("brands.title"), href: "/brands" }]} />
      <h1 className="mt-3 font-display text-4xl lg:text-5xl">{t("brands.title")}</h1>
      <p className="mt-3 text-base text-muted">{t("brands.intro")}</p>
      <div className="mt-10 space-y-10">
        {[...groups.entries()].map(([letter, list]) => (
          <section key={letter} aria-labelledby={`brands-${letter}`}>
            <h2 id={`brands-${letter}`} className="border-b border-line pb-2 text-xl font-semibold">
              {letter}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((brand) => (
                <li key={brand.slug}>
                  <Link href={`/brands/${brand.slug}`} className="group block h-full rounded-md border border-line bg-raised p-5 transition-colors hover:border-line-strong">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-lg font-semibold group-hover:text-accent">{brand.name}</span>
                      <span className="text-sm text-muted">{brand.productCount === 1 ? t("brands.productsOne") : t("brands.products", { count: brand.productCount })}</span>
                    </span>
                    {brand.intro && <span className="mt-2 line-clamp-3 block text-sm text-muted">{brand.intro}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
