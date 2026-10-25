import type { Metadata } from "next";

type SearchParams = Record<string, string | string[] | undefined>;

const NEUTRAL = new Set(["sort", "page", "gclid", "fbclid", "msclkid", "ref"]);

/**
 * Indexing rules for listing pages (Part 6): sort, view and tracking parameters canonicalise to the
 * clean URL; page 2+ is self-canonical; any filter makes the page noindex, follow.
 */
export function listingIndexing(basePath: string, params: SearchParams): Pick<Metadata, "alternates" | "robots"> {
  const keys = Object.keys(params).filter((key) => params[key] !== undefined && params[key] !== "");
  const filtered = keys.some((key) => !NEUTRAL.has(key) && !key.startsWith("utm_"));
  const pageValue = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const page = Number.isInteger(pageValue) && pageValue > 1 ? pageValue : 1;

  if (filtered) return { alternates: { canonical: basePath }, robots: { index: false, follow: true } };
  return { alternates: { canonical: page > 1 ? `${basePath}?page=${page}` : basePath } };
}

/** First sentences of an intro, cut at a word boundary, for a default meta description. */
export function describe(text: string | null | undefined, max = 155): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
