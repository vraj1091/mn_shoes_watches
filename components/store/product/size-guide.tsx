"use client";

import { useRef, type ReactNode } from "react";

/** "Size guide" link that opens the chart in the browser's own modal <dialog>. */
export function SizeGuide({ label, title, closeLabel, closeIcon, icon, children }: {
  label: string;
  title: string;
  closeLabel: string;
  closeIcon: ReactNode;
  icon: ReactNode;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-link underline underline-offset-4 hover:no-underline"
      >
        {icon}
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="size-guide-title"
        onClick={(event) => event.target === event.currentTarget && dialog.current?.close()}
        className="modal-center m-auto max-h-[88dvh] w-[min(92vw,40rem)] max-w-none overflow-hidden rounded-md bg-raised p-0 text-ink shadow-overlay backdrop:bg-scrim"
      >
        <div className="flex max-h-[88dvh] flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pr-2 pl-5">
            <h2 id="size-guide-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={() => dialog.current?.close()}
              className="flex size-11 items-center justify-center rounded-sm hover:bg-surface"
            >
              {closeIcon}
            </button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      </dialog>
    </>
  );
}
