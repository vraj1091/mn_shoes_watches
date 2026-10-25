"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { staffAuthClient } from "@/lib/auth/staff-client";
import { reloadTo } from "@/lib/auth/reload-to";
import { Button } from "@/components/ui/button";
import { FormAlert, Input, Label } from "@/components/ui/field";

type Labels = Record<"email" | "password" | "signIn" | "signingIn" | "wrongCredentials" | "tooMany" | "genericError", string>;

export function StaffSignIn({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const { data, error: failure } = await staffAuthClient.signIn.email({
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
    });
    if (failure) {
      setBusy(false);
      setError(failure.status === 429 ? labels.tooMany : failure.status && failure.status < 500 ? labels.wrongCredentials : labels.genericError);
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push("/admin/two-factor");
      return;
    }
    reloadTo("/admin");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormAlert>{error}</FormAlert>
      <div>
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div>
        <Label htmlFor="password">{labels.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? labels.signingIn : labels.signIn}
      </Button>
    </form>
  );
}
