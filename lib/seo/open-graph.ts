import type { Metadata } from "next";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/** The default link preview, made by `npm run tokens` (public/og.png). */
export const DEFAULT_OG_IMAGE = { url: "/og.png", width: 1200, height: 630 };

/**
 * Link-preview fields for WhatsApp, Facebook, X and the rest. A page that sets openGraph replaces
 * the layout's whole block (Next merges metadata shallowly), so pages build theirs here and keep
 * the shared fields. Without a title the platforms fall back to the page's <title>.
 */
export function openGraph(siteName: string, page: Partial<OpenGraph> = {}): OpenGraph {
  return { siteName, locale: "en_IN", type: "website", images: [DEFAULT_OG_IMAGE], ...page };
}
