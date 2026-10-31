"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/lib/actions/newsletter";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

type Labels = {
  email: string;
  submit: string;
  done: string;
  invalid: string;
  busy: string;
  error: string;
};

export function NewsletterForm({ labels }: { labels: Labels }) {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeToNewsletter, { status: "idle" });

  if (state.status === "done") {
    return (
      <p role="status" className="text-sm text-success">
        {labels.done}
      </p>
    );
  }

  const message =
    state.status === "invalid" ? labels.invalid : state.status === "busy" ? labels.busy : state.status === "error" ? labels.error : null;

  return (
    <form action={action} noValidate>
      <label htmlFor="newsletter-email" className="sr-only">
        {labels.email}
      </label>
      <div className="flex flex-col gap-2 min-[420px]:flex-row lg:flex-col xl:flex-row">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder={labels.email}
          aria-invalid={state.status === "invalid" || undefined}
          aria-describedby={message ? "newsletter-message" : undefined}
          className={inputClasses}
        />
        <button type="submit" disabled={pending} className={buttonClasses("secondary", "md", "shrink-0")}>
          {labels.submit}
        </button>
      </div>
      {/* Honeypot: hidden from people and screen readers, filled in by bots. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {message && (
        <p id="newsletter-message" role="alert" className="mt-2 text-sm text-error">
          {message}
        </p>
      )}
    </form>
  );
}
