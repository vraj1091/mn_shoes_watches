"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/button";

/**
 * Shown when an admin page fails to load. Nothing that was saved is lost; the reference matches
 * the line in the server log, so the cause can be found.
 */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div role="alert" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10">
      <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">This page did not load</h1>
      <p className="mt-3 text-base text-muted">Something went wrong on the server. Changes you saved before are kept. Try again; if it keeps happening, send the reference below to whoever looks after the website.</p>
      {digest && <p className="mt-2 text-sm text-muted tabular-nums">Reference: {digest}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className={buttonClasses("primary", "md")}>
          Try again
        </button>
        <Link href="/admin" className={buttonClasses("secondary", "md")}>
          Go to the dashboard
        </Link>
      </div>
    </div>
  );
}
