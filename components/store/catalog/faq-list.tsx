import { CaretDownIcon } from "@/components/icons";
import type { Faq } from "@/lib/data/catalog";

/** Questions and answers as native disclosures: readable without JavaScript and by crawlers. FAQPage JSON-LD comes in Phase 5. */
export function FaqList({ title, faqs }: { title: string; faqs: Faq[] }) {
  if (faqs.length === 0) return null;
  return (
    <section aria-labelledby="faq-heading" className="measure">
      <h2 id="faq-heading" className="font-display text-2xl lg:text-3xl">
        {title}
      </h2>
      <div className="mt-4 border-t border-line">
        {faqs.map((faq) => (
          <details key={faq.question} className="group border-b border-line">
            <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-medium [&::-webkit-details-marker]:hidden">
              {faq.question}
              <CaretDownIcon size={18} className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="pb-4 text-base text-muted">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
