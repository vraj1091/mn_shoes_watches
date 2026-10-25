"use client";

import { useEffect } from "react";

// Error boundaries are client components and cannot read the message files on the server,
// so this one short screen keeps its English text inline.
export default function StoreError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl">This page did not load</h1>
      <p className="measure mt-4 text-lg text-muted">
        Something went wrong on our side. Please try again. If it keeps happening, call or WhatsApp the shop.
      </p>
      {digest && <p className="mt-2 text-sm text-muted tabular-nums">Reference: {digest}</p>}
      <button
        type="button"
        onClick={() => retry()}
        className="mt-8 inline-flex min-h-11 items-center rounded-sm bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover"
      >
        Try again
      </button>
    </div>
  );
}
