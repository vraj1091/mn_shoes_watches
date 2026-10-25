"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";

type Props = {
  /** Listing path without query, e.g. /mens-shoes/formal */
  action: string;
  /** Navigate on every change (desktop sidebar, sort) or only on submit (phone sheet). */
  autoSubmit: boolean;
  className?: string;
  onSubmitted?: () => void;
  children: ReactNode;
};

/**
 * A plain GET form that works without JavaScript (tick, then "Apply filters"). With JavaScript it
 * navigates in place, keeping the scroll position, and marks itself data-enhanced so the
 * fallback button can hide.
 */
export function FilterForm({ action, autoSubmit, className, onSubmitted, children }: Props) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    form.current?.setAttribute("data-enhanced", "");
  }, []);

  function navigate() {
    if (!form.current) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form.current)) {
      if (typeof value === "string" && value !== "") params.append(key, value);
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `${action}?${query}` : action, { scroll: false }));
  }

  return (
    <form
      ref={form}
      action={action}
      method="get"
      aria-busy={pending || undefined}
      className={`group/filters transition-opacity duration-150 aria-busy:opacity-60 ${className ?? ""}`}
      onChange={autoSubmit ? navigate : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        navigate();
        onSubmitted?.();
      }}
    >
      {children}
    </form>
  );
}
