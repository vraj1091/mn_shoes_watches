import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/data/content";
import { t } from "@/lib/i18n";
import { ContentPageView } from "@/components/store/content-page";

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props["params"]) {
  const page = await getPage(decodeURIComponent((await params).slug));
  return page && page.kind === "POLICY" ? page : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load(params);
  if (!page) return { title: t("notFound.metaTitle"), robots: { index: false } };
  return { title: page.metaTitle ?? page.title, description: page.metaDescription ?? undefined, alternates: { canonical: `/policies/${page.slug}` } };
}

export default async function PolicyPage({ params }: Props) {
  const page = await load(params);
  if (!page) notFound();
  return <ContentPageView page={page} trail={[{ name: page.title, href: `/policies/${page.slug}` }]} updatedLabel={t("pages.updated")} />;
}
