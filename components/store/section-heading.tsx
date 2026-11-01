import Link from "next/link";

/**
 * The heading row of a store section: a hairline across the page, the serif title at one size and
 * an optional text link. Sections are told apart by rules and space, not by boxes (DECISIONS.md 74).
 */
export function SectionHeading({ id, title, link }: { id: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between gap-4 border-t border-line pt-5">
      <h2 id={id} className="font-display text-2xl lg:text-3xl">
        {title}
      </h2>
      {link && (
        <Link href={link.href} className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-link underline underline-offset-4 hover:text-accent hover:no-underline">
          {link.label}
        </Link>
      )}
    </div>
  );
}
