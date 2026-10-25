import Link from "next/link";
import { t } from "@/lib/i18n";
import { CaretRightIcon } from "@/components/icons";

export type Crumb = { name: string; href: string };

/** Breadcrumbs; the last item is the current page. BreadcrumbList JSON-LD is added in Phase 5. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: t("common.home"), href: "/" }, ...items];
  return (
    <nav aria-label={t("catalog.breadcrumbs")} className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {all.map((crumb, index) => {
          const last = index === all.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-ink">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link href={crumb.href} className="inline-flex min-h-11 items-center hover:text-link">
                    {crumb.name}
                  </Link>
                  <CaretRightIcon size={12} className="shrink-0" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
