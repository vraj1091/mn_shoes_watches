import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/data/content";
import { ContentPageView } from "@/components/store/content-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return { title: page?.metaTitle ?? page?.title ?? "About", description: page?.metaDescription ?? undefined, alternates: { canonical: "/about" } };
}

export default async function AboutPage() {
  const page = await getPage("about");
  if (!page) notFound();
  return <ContentPageView page={page} trail={[{ name: page.title, href: "/about" }]} />;
}
