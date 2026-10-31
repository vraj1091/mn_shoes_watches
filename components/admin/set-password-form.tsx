"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { staffAuthClient } from "@/lib/auth/staff-client";
import { Button } from "@/components/ui/button";
import { FormAlert, Hint, Input, Label } from "@/components/ui/field";

/** Sets a staff password from an emailed invite or reset link (Better Auth's /reset-password). */
export function SetPasswordForm({ token, email, minLength }: { token: string; email: string; minLength: number }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("new") ?? "");
    setError(null);
    if (newPassword.length < minLength) {
      setError(`Use at least ${minLength} characters. A short sentence is easy to remember.`);
      return;
    }
    if (newPassword !== String(form.get("confirm") ?? "")) {
      setError("The two passwords are not the same.");
      return;
    }
    setBusy(true);
    const { error: failure } = await staffAuthClient.resetPassword({ newPassword, token });
    setBusy(false);
    if (failure) {
      setError(
        failure.code === "INVALID_TOKEN"
          ? "This link has expired or was already used. Ask for a new one below."
          : failure.code === "PASSWORD_TOO_COMMON"
            ? "That password is too common. Choose one that is harder to guess."
            : failure.status === 429
              ? "Too many attempts. Wait 15 minutes and try again."
              : "The password could not be saved. Please try again.",
      );
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-5">
        <FormAlert tone="success">Your password is set. Sign in with {email} and the new password.</FormAlert>
        <Link href="/admin/sign-in" className="inline-flex min-h-11 items-center font-medium text-link underline underline-offset-4">
          Go to sign-in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormAlert>{error}</FormAlert>
      {/* Lets password managers save the new password against the right account. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <div>
        <Label htmlFor="pw-new">New password</Label>
        {/* No minLength attribute: the browser's own tooltip would pre-empt the clearer message above. */}
        <Input id="pw-new" name="new" type="password" autoComplete="new-password" required autoFocus aria-describedby="pw-hint" />
        <Hint id="pw-hint">At least {minLength} characters. A short sentence works well.</Hint>
      </div>
      <div>
        <Label htmlFor="pw-confirm">New password again</Label>
        <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : "Set password"}
      </Button>
      {error?.startsWith("This link") && (
        <Link href="/admin/forgot-password" className="inline-flex min-h-11 items-center text-sm text-link underline underline-offset-4">
          Email me a new link
        </Link>
      )}
    </form>
  );
}
