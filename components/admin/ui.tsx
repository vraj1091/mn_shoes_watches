import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { inputClasses } from "@/components/ui/field";

/** Shared admin building blocks: cards, tables, labelled fields, status badges. Sans-serif throughout. */

export function Card({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-line bg-raised ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="relative overflow-x-auto rounded-md border border-line bg-raised">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export const th = "border-b border-line bg-surface px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted uppercase";
export const td = "border-b border-line px-4 py-3 align-middle";

const TONES = {
  neutral: "bg-surface text-ink border-line",
  good: "bg-surface text-success border-line",
  bad: "bg-surface text-error border-line",
  info: "bg-surface text-link hover:text-accent border-line",
  warning: "bg-surface text-ink border-warning",
} as const;

export function StatusBadge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

/**
 * A labelled form control with an optional hint. The label wraps the control, so it always names
 * its own field even when two forms on one page use the same field name.
 */
export function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children?: ReactNode }) {
  return (
    <div className={className}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{label}</span>
        {children}
      </label>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function TextInput({ name, ...props }: ComponentProps<"input"> & { name: string }) {
  return <input name={name} {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function TextArea({ name, rows = 4, ...props }: ComponentProps<"textarea"> & { name: string }) {
  return <textarea name={name} rows={rows} {...props} className={`${inputClasses} py-2 ${props.className ?? ""}`} />;
}

export function Select({ name, children, ...props }: ComponentProps<"select"> & { name: string }) {
  return (
    <select name={name} {...props} className={`${inputClasses} ${props.className ?? ""}`}>
      {children}
    </select>
  );
}

export function Checkbox({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-[var(--link)]" />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-line-strong bg-raised px-6 py-10 text-center text-sm text-muted">{children}</p>;
}

/** Previous / next page links for long admin lists. */
export function Pager({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="inline-flex min-h-11 items-center text-link hover:text-accent underline underline-offset-4">
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted tabular-nums">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className="inline-flex min-h-11 items-center text-link hover:text-accent underline underline-offset-4">
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** A big number with a short label: sales, orders, average order value. */
export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border border-line bg-raised p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="price mt-1 text-2xl font-semibold">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}
