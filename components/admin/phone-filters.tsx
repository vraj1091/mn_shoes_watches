"use client";

import { useId, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";

/**
 * On a phone, a list's extra filter fields fold behind one button so the list starts on the first
 * screen; open by default while one of them is in use. From 640 px the wrapper drops out of the
 * layout (display: contents) and the fields sit in the form's own grid.
 */
export function PhoneFilters({ label, open: initiallyOpen, children }: { label: string; open: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  return (
    <>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className={buttonClasses("secondary", "md", "sm:hidden")}>
        {label}
      </button>
      <div id={id} className={`grid gap-3 sm:contents ${open ? "" : "max-sm:hidden"}`}>
        {children}
      </div>
    </>
  );
}
