import type { ProductReviews } from "@/lib/data/reviews";
import { formatDate } from "@/lib/format/date";
import { t } from "@/lib/i18n";

export function Stars({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((index) => (
        <svg key={index} viewBox="0 0 20 20" className={`${size} ${index <= Math.round(rating) ? "fill-star" : "fill-line"}`}>
          <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8l-5.2 2.7 1-5.8L1.6 7.6l5.8-.8z" />
        </svg>
      ))}
    </span>
  );
}

/** Rating summary with the spread of stars, then the reviews themselves, newest first. */
export function ReviewsSection({ data }: { data: ProductReviews }) {
  return (
    <section aria-labelledby="reviews-heading" className="mt-16 border-t border-line pt-12">
      <h2 id="reviews-heading" className="font-display text-2xl lg:text-3xl">
        {t("product.reviewsTitle")}
      </h2>
      {data.count === 0 ? (
        <p className="mt-4 text-base text-muted">{t("product.reviewsNone")}</p>
      ) : (
        <div className="mt-6 grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="flex items-center gap-3">
              <span className="price text-4xl font-semibold">{data.average.toFixed(1)}</span>
              <span>
                <Stars rating={data.average} size="size-5" />
                <span className="block text-sm text-muted">{data.count === 1 ? t("product.reviewsCountOne") : t("product.reviewsCount", { count: data.count })}</span>
              </span>
            </p>
            <p className="sr-only">{t("product.reviewsAverage", { rating: data.average.toFixed(1) })}</p>
            <dl className="mt-5 space-y-2">
              {data.distribution.map((row) => (
                <div key={row.stars} className="flex items-center gap-3 text-sm">
                  <dt className="w-14 shrink-0 text-muted">{t("product.reviewsStars", { stars: row.stars })}</dt>
                  <dd className="flex flex-1 items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <span className="block h-full rounded-full bg-star" style={{ width: `${(row.count / data.count) * 100}%` }} />
                    </span>
                    <span className="price w-6 text-right text-muted">{row.count}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <ul className="divide-y divide-line">
            {data.reviews.map((review) => (
              <li key={review.id} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars rating={review.rating} />
                  <span className="sr-only">{t("product.reviewsAverage", { rating: review.rating })}</span>
                  <span className="text-sm font-semibold">{review.authorName}</span>
                  {review.isVerifiedBuyer && <span className="rounded-sm bg-badge px-1.5 py-0.5 text-xs font-semibold text-badge-ink">{t("product.verifiedBuyer")}</span>}
                  {review.publishedAt && <span className="text-sm text-muted">{formatDate(review.publishedAt)}</span>}
                </div>
                {review.title && <p className="mt-2 font-semibold">{review.title}</p>}
                <p className="mt-1 text-base">{review.body}</p>
                {review.reply && <p className="mt-3 border-l-2 border-line pl-3 text-sm text-muted">{review.reply}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
