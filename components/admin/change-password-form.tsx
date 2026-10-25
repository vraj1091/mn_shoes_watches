"use client";

import { useState, type FormEvent } from "react";
import { staffAuthClient } from "@/lib/auth/staff-client";
import { Button } from "@/components/ui/button";
import { FormAlert, Hint, Input, Label } from "@/components/ui/field";

export function ChangePasswordForm({ minLength }: { minLength: number }) {
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("current") ?? "");
    const newPassword = String(form.get("new") ?? "");
    if (newPassword.length < minLength) {
      setMessage({ tone: "error", text: `Use at least ${minLength} characters. A short sentence is easy to remember.` });
      return;
    }
    if (newPassword !== String(form.get("confirm") ?? "")) {
      setMessage({ tone: "error", text: "The two new passwords are not the same." });
      return;
    }
    setBusy(true);
    const { error } = await staffAuthClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setBusy(false);
    if (error) {
      setMessage({ tone: "error", text: error.status === 400 ? "Your current password is not right." : "Could not change the password. Please try again." });
      return;
    }
    formElement.reset();
    setMessage({ tone: "success", text: "Password changed. Other devices have been signed out." });
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      <FormAlert tone={message?.tone}>{message?.text}</FormAlert>
      <div>
        <Label htmlFor="pw-current">Current password</Label>
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <Label htmlFor="pw-new">New password</Label>
        <Input id="pw-new" name="new" type="password" autoComplete="new-password" minLength={minLength} required aria-describedby="pw-hint" />
        <Hint id="pw-hint">At least {minLength} characters.</Hint>
      </div>
      <div>
        <Label htmlFor="pw-confirm">New password again</Label>
        <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <Button type="submit" variant="secondary" disabled={busy}>
        Change password
      </Button>
    </form>
  );
}
