import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/data/content";
import { getPrimaryLocation } from "@/lib/data/store";
import { describeOpeningHours } from "@/lib/format/hours";
import { t } from "@/lib/i18n";
import { ContactForm, type ContactLabels } from "@/components/store/contact-form";
import { ContentPageView } from "@/components/store/content-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("contact");
  return { title: page?.metaTitle ?? page?.title ?? "Contact", description: page?.metaDescription ?? undefined, alternates: { canonical: "/contact" } };
}

export default async function ContactPage() {
  const [page, location] = await Promise.all([getPage("contact"), getPrimaryLocation()]);
  if (!page) notFound();
  const keys = ["formTitle", "name", "contact", "message", "send", "done", "invalid", "busy"] as const;
  const labels = Object.fromEntries(keys.map((key) => [key, t(`contact.${key}`)])) as ContactLabels;
  const hours = location ? describeOpeningHours(location.openingHours) : [];
  return (
    <ContentPageView page={page} trail={[{ name: page.title, href: "/contact" }]}>
      {location && (
        <section aria-labelledby="contact-visit" className="mt-10 rounded-md bg-surface p-5 sm:p-6">
          <h2 id="contact-visit" className="text-lg font-semibold">
            {t("contact.visit")}
          </h2>
          <address className="mt-2 text-base not-italic">
            {location.name}
            <br />
            {[location.line1, location.line2].filter(Boolean).join(", ")}
            <br />
            {location.city}, {location.state} {location.pinCode}
          </address>
          {hours.length > 0 && (
            <ul className="mt-3 text-sm text-muted">
              {hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {location.mapUrl && (
            <a href={location.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-link underline underline-offset-4">
              {t("contact.directions")}
            </a>
          )}
        </section>
      )}
      <div className="mt-8">
        <ContactForm labels={labels} />
      </div>
    </ContentPageView>
  );
}
