"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export const ANNOUNCEMENT_COOKIE = "mn-announcement";

type Props = {
  text: string;
  href: string | null;
  version: number;
  dismissLabel: string;
  closeIcon: ReactNode;
};

/**
 * One owner-written line. Dismissing stores the version in a cookie, so the server leaves the bar
 * out of the next page (no flash, no layout shift). A new version from the admin shows it again.
 */
export function AnnouncementBar({ text, href, version, dismissLabel, closeIcon }: Props) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  function dismiss() {
    document.cookie = `${ANNOUNCEMENT_COOKIE}=${version}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setOpen(false);
  }

  return (
    <div className="relative bg-primary text-on-primary">
      <p className="mx-auto max-w-screen-xl px-12 py-2 text-center text-sm">
        {href ? (
          <Link href={href} className="underline decoration-1 underline-offset-4 hover:decoration-2">
            {text}
          </Link>
        ) : (
          text
        )}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={dismissLabel}
        className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-sm opacity-80 hover:opacity-100"
      >
        {closeIcon}
      </button>
    </div>
  );
}
