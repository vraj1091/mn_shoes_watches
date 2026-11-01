import type { JsonLdObject } from "@/lib/seo/structured-data";

/** One JSON-LD block. "<" is escaped so a product name or review can never close the script tag. */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
