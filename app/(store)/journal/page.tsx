import type { Metadata } from "next";
import { getPosts } from "@/lib/data/content";
import { t } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";
import { PostCard } from "@/components/store/post-card";

export const metadata: Metadata = { title: t("journal.title"), description: t("journal.intro"), alternates: { canonical: "/journal" } };

export default async function JournalPage() {
  const posts = await getPosts();
  return (
    <div className="mx-auto max-w-screen-xl px-4 pt-6 pb-4 sm:px-6 lg:px-8 lg:pt-8">
      <Breadcrumbs items={[{ name: t("journal.title"), href: "/journal" }]} />
      <h1 className="mt-3 font-display text-4xl lg:text-5xl">{t("journal.title")}</h1>
      <p className="measure mt-3 text-base text-muted">{t("journal.intro")}</p>
      <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </div>
  );
}
