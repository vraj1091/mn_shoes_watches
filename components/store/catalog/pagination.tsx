import Link from "next/link";
import { listingHref, type ListingResult, type ListingState, type SortKey } from "@/lib/catalog/query";
import { t } from "@/lib/i18n";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";

/** Page numbers to show: first, last, and a window around the current page, with gaps as null. */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1]! > 1 ? [null, n] : [n]));
}

const cell = "flex min-h-11 min-w-11 items-center justify-center rounded-sm px-3 text-sm tabular-nums";

/** Crawlable ?page=N links (Part 4). The "Show more" button sits above and appends instead. */
export function Pagination({
  basePath,
  state,
  result,
  defaultSort,
}: {
  basePath: string;
  state: ListingState;
  result: ListingResult;
  defaultSort: SortKey;
}) {
  if (result.pageCount <= 1) return null;
  const href = (page: number) => listingHref(basePath, state, defaultSort, { page });
  return (
    <nav aria-label={t("catalog.pagination")} className="mt-10 flex flex-wrap items-center justify-center gap-1">
      {result.page > 1 && (
        <Link href={href(result.page - 1)} rel="prev" className={`${cell} text-ink hover:bg-surface`} aria-label={t("catalog.previous")}>
          <ArrowLeftIcon size={18} />
        </Link>
      )}
      {pageWindow(result.page, result.pageCount).map((page, i) =>
        page === null ? (
          <span key={`gap-${i}`} className={`${cell} text-muted`}>
            …
          </span>
        ) : page === result.page ? (
          <span key={page} aria-current="page" className={`${cell} border border-ink font-medium text-ink`}>
            {page}
          </span>
        ) : (
          <Link key={page} href={href(page)} aria-label={t("catalog.pageNumber", { page })} className={`${cell} text-ink hover:bg-surface`}>
            {page}
          </Link>
        ),
      )}
      {result.page < result.pageCount && (
        <Link href={href(result.page + 1)} rel="next" className={`${cell} text-ink hover:bg-surface`} aria-label={t("catalog.next")}>
          <ArrowRightIcon size={18} />
        </Link>
      )}
    </nav>
  );
}
