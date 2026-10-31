import type { ComponentProps, ReactNode } from "react";

export const inputClasses =
  "block w-full min-h-11 rounded-sm border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-muted transition-colors duration-150 hover:border-muted focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-link aria-invalid:border-error disabled:opacity-60";

export function Label({ className = "", ...props }: ComponentProps<"label">) {
  return <label className={`mb-1.5 block text-sm font-medium text-ink ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputClasses} ${className}`} {...props} />;
}

export function Hint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-muted">
      {children}
    </p>
  );
}

/** Form errors use the one colour outside the palette, so they are recognised instantly. */
export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-error">
      {children}
    </p>
  );
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children?: ReactNode }) {
  if (!children) return null;
  const tones = {
    error: "border-error/40 text-error",
    success: "border-success/40 bg-surface text-success",
    info: "border-line bg-surface text-ink",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-sm border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}
