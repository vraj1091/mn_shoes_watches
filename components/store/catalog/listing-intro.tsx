"use client";

import { useState } from "react";

/**
 * A category, collection or brand introduction. On a phone it shows three lines and a "Read more"
 * button, so the products start on the first screen; wider screens show it all. The whole text
 * is always in the page, for search engines and screen readers.
 */
export function ListingIntro({ text, labels }: { text: string; labels: { more: string; less: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="measure mt-4">
      <p className={`text-base text-ink lg:text-lg ${open ? "" : "max-sm:line-clamp-3"}`}>{text}</p>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mt-1 min-h-11 text-sm font-medium text-link underline underline-offset-4 hover:text-accent sm:hidden">
        {open ? labels.less : labels.more}
      </button>
    </div>
  );
}
