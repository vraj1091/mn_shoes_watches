"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "./toast";

export type FormState = { status: "idle" | "saved" | "error"; message?: string; errors?: string[] };
export const IDLE: FormState = { status: "idle" };

/**
 * A server-action form with a saved / error message above the button. Inputs are plain server-
 * rendered fields; the action validates and returns FormState (or redirects on create). The
 * button is an espresso outline; `primary` makes it the page's one oxblood button.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Save",
  className = "",
  primary = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  primary?: boolean;
}) {
  const toast = useToast();
  // The toast is raised as the answer arrives, not from an effect: a save can change the page so
  // this form is gone in the same render (a cancelled order has no next status), and its message
  // must still show. Errors stay next to the fields they are about.
  const [state, formAction, pending] = useActionState(async (previous: FormState, formData: FormData) => {
    const next = await action(previous, formData);
    if (next.status === "saved") toast?.(next.message ?? "Saved.");
    return next;
  }, IDLE);
  const [, startTransition] = useTransition();
  return (
    <form
      action={formAction}
      // React resets a form after its action finishes, and a <select> then falls back to the value
      // it was first rendered with, so a second save could undo the first (status back to Draft).
      // Submitting from onSubmit keeps the fields as saved; `action` stays for the no-JS case.
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      className={className}
    >
      {children}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses(primary ? "primary" : "secondary", "md")}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <div aria-live="polite" className="text-sm">
          {state.status === "saved" && !toast && <span className="font-medium text-success">{state.message ?? "Saved."}</span>}
          {state.status === "error" && (
            <div role="alert" className="text-error">
              <p className="font-medium">{state.message ?? "Please fix the following:"}</p>
              {state.errors && state.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {state.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

/**
 * A destructive button that asks once more before acting. With `typeToConfirm`, the person must
 * type that word first (used for "Remove all demo data").
 */
export function ConfirmButton({
  action,
  label,
  confirmLabel,
  question,
  typeToConfirm,
  variant = "danger",
}: {
  action: () => Promise<{ ok: boolean; message?: string } | void>;
  label: string;
  confirmLabel: string;
  question: string;
  typeToConfirm?: string;
  variant?: "danger" | "secondary";
}) {
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (!asking) {
    return (
      <div>
        <button type="button" onClick={() => setAsking(true)} className={buttonClasses("secondary", "sm", variant === "danger" ? "text-error" : "")}>
          {label}
        </button>
        {message && (
          <p role="status" className="mt-2 text-sm">
            {message}
          </p>
        )}
      </div>
    );
  }
  return (
    <div role="group" aria-label={question} className="rounded-md border border-line bg-surface p-3">
      <p className="text-sm font-medium">{question}</p>
      {typeToConfirm && (
        <label className="mt-2 block text-sm">
          Type <strong>{typeToConfirm}</strong> to confirm
          <input value={typed} onChange={(event) => setTyped(event.target.value)} className="mt-1 block min-h-11 w-full rounded-sm border border-line-strong bg-canvas px-3" autoFocus />
        </label>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending || (typeToConfirm !== undefined && typed.trim() !== typeToConfirm)}
          onClick={() =>
            startTransition(async () => {
              const result = await action();
              setAsking(false);
              setTyped("");
              if (result?.message) {
                if (toast) toast(result.message, result.ok ? "success" : "error");
                else setMessage(result.message);
              }
            })
          }
          className={buttonClasses("danger", "sm")}
        >
          {pending ? "Working…" : confirmLabel}
        </button>
        <button type="button" onClick={() => setAsking(false)} className={buttonClasses("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </div>
  );
}
