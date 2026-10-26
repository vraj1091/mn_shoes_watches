import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/data/content";
import { formatDate } from "@/lib/format/date";
import { t } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/store/catalog/breadcrumbs";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(decodeURIComponent((await params).slug));
  if (!post) return { title: t("notFound.metaTitle"), robots: { index: false } };
  return { title: post.metaTitle ?? post.title, description: post.metaDescription ?? post.excerpt ?? undefined, alternates: { canonical: `/journal/${post.slug}` } };
}

export default async function JournalPostPage({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  const [post, all] = await Promise.all([getPost(slug), getPosts()]);
  if (!post) notFound();
  const more = all.filter((entry) => entry.slug !== post.slug).slice(0, 2);
  return (
    <article className="mx-auto max-w-3xl px-4 pt-6 pb-4 sm:px-6 lg:pt-8">
      <Breadcrumbs items={[{ name: t("journal.title"), href: "/journal" }, { name: post.title, href: `/journal/${post.slug}` }]} />
      <h1 className="mt-3 font-display text-4xl leading-tight lg:text-5xl">{post.title}</h1>
      <p className="mt-3 text-sm text-muted">
        {[t("journal.by", { author: post.author }), post.publishedAt ? t("journal.published", { date: formatDate(post.publishedAt) }) : null, post.readingMinutes ? t("journal.minutes", { minutes: post.readingMinutes }) : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {post.cover && (
        <div className="photo-tile relative mt-6 aspect-[16/9] overflow-hidden rounded-md">
          <Image src={post.cover.url} alt={post.cover.alt} fill sizes="(min-width: 768px) 720px, 92vw" preload className="object-contain p-[6%]" />
        </div>
      )}
      {post.excerpt && <p className="mt-6 text-lg">{post.excerpt}</p>}
      {/* Sanitised when saved in the admin. */}
      <div className="rich-text mt-6" dangerouslySetInnerHTML={{ __html: post.html }} />
      {more.length > 0 && (
        <aside aria-labelledby="more-guides" className="mt-14 border-t border-line pt-8">
          <h2 id="more-guides" className="text-lg font-semibold">
            {t("journal.more")}
          </h2>
          <ul className="mt-3 space-y-2">
            {more.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/journal/${entry.slug}`} className="text-link underline underline-offset-4">
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
