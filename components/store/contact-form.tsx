"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/lib/actions/shop";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

export type ContactLabels = Record<"formTitle" | "name" | "contact" | "message" | "send" | "done" | "invalid" | "busy", string>;

export function ContactForm({ labels }: { labels: ContactLabels }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: "idle" });
  if (state.status === "done") {
    return (
      <p role="status" className="rounded-md border border-line bg-surface px-5 py-4 text-base text-success">
        {labels.done}
      </p>
    );
  }
  const error = state.status === "invalid" ? labels.invalid : state.status === "busy" ? labels.busy : null;
  return (
    <form action={action} className="space-y-4 rounded-md border border-line p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{labels.formTitle}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
            {labels.name}
          </label>
          <input id="contact-name" name="name" autoComplete="name" required maxLength={80} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="contact-contact" className="mb-1.5 block text-sm font-medium">
            {labels.contact}
          </label>
          <input id="contact-contact" name="contact" autoComplete="email" required maxLength={160} className={inputClasses} />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
          {labels.message}
        </label>
        <textarea id="contact-message" name="message" rows={5} required maxLength={2000} className={`${inputClasses} py-2`} />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClasses("primary", "md")}>
        {labels.send}
      </button>
    </form>
  );
}
