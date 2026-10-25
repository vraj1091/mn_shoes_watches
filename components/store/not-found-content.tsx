import Link from "next/link";
import { getCategoryNavigation } from "@/lib/data/navigation";
import { t } from "@/lib/i18n";
import { SearchIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";

/** 404 (Part 4, page 11): search, the main departments, and a way home. */
export async function NotFoundContent() {
  const departments = await getCategoryNavigation();
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <p className="text-sm tracking-[0.14em] text-muted uppercase">404</p>
      <h1 className="mt-3 font-display text-4xl lg:text-5xl">{t("notFound.title")}</h1>
      <p className="measure mt-4 text-lg text-muted">{t("notFound.intro")}</p>

      <form action="/search" role="search" className="mt-8 flex max-w-xl gap-2">
        <label htmlFor="not-found-search" className="sr-only">
          {t("header.searchLabel")}
        </label>
        <div className="flex flex-1 items-center gap-2 rounded-sm border border-line-strong px-3 focus-within:border-fg">
          <SearchIcon size={20} className="text-muted" />
          <input
            id="not-found-search"
            name="q"
            type="search"
            placeholder={t("header.searchPlaceholder")}
            className="min-h-11 w-full bg-transparent outline-none placeholder:text-muted"
          />
        </div>
        <button type="submit" className={buttonClasses()}>
          {t("common.search")}
        </button>
      </form>

      {departments.length > 0 && (
        <nav aria-labelledby="not-found-popular" className="mt-14">
          <h2 id="not-found-popular" className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
            {t("notFound.popular")}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {departments.flatMap((dept) => [dept, ...dept.children.slice(0, 3)]).map((category) => (
              <li key={category.id}>
                <Link href={category.href} className={buttonClasses("secondary", "md")}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <Link href="/" className="mt-12 inline-block text-accent underline decoration-1 underline-offset-4 hover:decoration-2">
        {t("common.backToShop")}
      </Link>
    </div>
  );
}
