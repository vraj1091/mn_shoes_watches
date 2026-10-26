import type { ReactNode } from "react";
import type { ContentPage } from "@/lib/data/content";
import { formatDate } from "@/lib/format/date";
import { Breadcrumbs, type Crumb } from "@/components/store/catalog/breadcrumbs";
import { FaqList } from "@/components/store/catalog/faq-list";

/** An owner-edited page: title, rich text, optional questions and answers, and anything extra below. */
export function ContentPageView({ page, trail, updatedLabel, children }: { page: ContentPage; trail: Crumb[]; updatedLabel?: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-4 sm:px-6 lg:pt-8">
      <Breadcrumbs items={trail} />
      <h1 className="mt-3 font-display text-4xl lg:text-5xl">{page.title}</h1>
      {updatedLabel && <p className="mt-2 text-sm text-muted">{updatedLabel.replace("{date}", formatDate(page.updatedAt))}</p>}
      {/* Sanitised when saved in the admin. */}
      <div className="rich-text mt-6" dangerouslySetInnerHTML={{ __html: page.html }} />
      {page.faqs.length > 0 && (
        <div className="mt-10">
          <FaqList title={page.title} faqs={page.faqs} />
        </div>
      )}
      {children}
    </div>
  );
}
