import Image from "next/image";
import Link from "next/link";
import type { PostSummary } from "@/lib/data/content";
import { formatDate } from "@/lib/format/date";
import { t } from "@/lib/i18n";

/** A Journal guide as a card: cover photo, serif title, excerpt, date and reading time. */
export function PostCard({ post, headingLevel = 2 }: { post: PostSummary; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex h-full flex-col">
      <div className="photo-tile relative aspect-[4/3] overflow-hidden rounded-md">
        {post.cover && <Image src={post.cover.url} alt="" fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 46vw, 92vw" className="object-contain p-[8%]" />}
      </div>
      <Heading className="mt-4 font-display text-2xl leading-tight">
        <Link href={`/journal/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-accent">
          {post.title}
        </Link>
      </Heading>
      {post.excerpt && <p className="mt-2 text-base text-muted">{post.excerpt}</p>}
      <p className="mt-3 text-sm text-muted">
        {[post.publishedAt ? formatDate(post.publishedAt) : null, post.readingMinutes ? t("journal.minutes", { minutes: post.readingMinutes }) : null].filter(Boolean).join(" · ")}
      </p>
    </article>
  );
}
