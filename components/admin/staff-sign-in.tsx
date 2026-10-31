"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { staffAuthClient } from "@/lib/auth/staff-client";
import { reloadTo } from "@/lib/auth/reload-to";
import { Button } from "@/components/ui/button";
import { FormAlert, Input, Label } from "@/components/ui/field";

type Labels = Record<"email" | "password" | "signIn" | "signingIn" | "wrongCredentials" | "tooMany" | "genericError" | "accountOff" | "forgotPassword", string>;

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
      // FAILED_TO_CREATE_SESSION comes after the password was checked: the account is switched off.
      setError(
        failure.status === 429
          ? labels.tooMany
          : failure.code === "FAILED_TO_CREATE_SESSION"
            ? labels.accountOff
            : failure.status && failure.status < 500
              ? labels.wrongCredentials
              : labels.genericError,
      );
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
        <div className="flex items-baseline justify-between gap-4">
          <Label htmlFor="password">{labels.password}</Label>
          <Link href="/admin/forgot-password" className="text-sm text-link underline-offset-4 hover:underline">
            {labels.forgotPassword}
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? labels.signingIn : labels.signIn}
      </Button>
    </form>
  );
}
