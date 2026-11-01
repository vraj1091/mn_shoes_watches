import { CaretDownIcon } from "@/components/icons";
import { JsonLd } from "@/components/seo/json-ld";
import type { Faq } from "@/lib/data/catalog";
import { faqPage } from "@/lib/seo/structured-data";

/** Questions and answers as native disclosures, readable without JavaScript and by crawlers, plus FAQPage JSON-LD. */
export function FaqList({ title, faqs }: { title: string; faqs: Faq[] }) {
  if (faqs.length === 0) return null;
  return (
    <section aria-labelledby="faq-heading" className="measure">
      <JsonLd data={faqPage(faqs)} />
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
