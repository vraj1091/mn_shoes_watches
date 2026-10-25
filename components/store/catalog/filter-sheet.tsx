"use client";

import { useRef, type ReactNode } from "react";
import { FilterForm } from "./filter-form";

type Props = {
  action: string;
  label: string;
  title: string;
  closeLabel: string;
  closeIcon: ReactNode;
  filterIcon: ReactNode;
  /** Fields, then the footer with "Show results" and "Clear all". */
  children: ReactNode;
};

/** Phone filters: a bottom sheet on the browser's own modal <dialog>. Applies on "Show results". */
export function FilterSheet({ action, label, title, closeLabel, closeIcon, filterIcon, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          document.documentElement.style.overflow = "hidden";
          dialog.current?.showModal();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-line-strong px-4 text-sm font-medium text-ink hover:border-ink lg:hidden"
      >
        {filterIcon}
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="filter-sheet-title"
        onClose={() => document.documentElement.style.removeProperty("overflow")}
        onClick={(event) => event.target === event.currentTarget && close()}
        className="sheet-bottom m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-md bg-raised p-0 text-ink backdrop:bg-scrim lg:hidden"
      >
        <FilterForm action={action} autoSubmit={false} onSubmitted={close} className="flex max-h-[88dvh] flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pr-2 pl-5">
            <h2 id="filter-sheet-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button type="button" aria-label={closeLabel} onClick={close} className="flex size-11 items-center justify-center rounded-sm hover:bg-surface">
              {closeIcon}
            </button>
          </div>
          {children}
        </FilterForm>
      </dialog>
    </>
  );
}
