import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/data/content";
import { ContentPageView } from "@/components/store/content-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("faq");
  return { title: page?.metaTitle ?? page?.title ?? "FAQ", description: page?.metaDescription ?? undefined, alternates: { canonical: "/faq" } };
}

export default async function FaqPage() {
  const page = await getPage("faq");
  if (!page) notFound();
  return <ContentPageView page={page} trail={[{ name: page.title, href: "/faq" }]} />;
}
