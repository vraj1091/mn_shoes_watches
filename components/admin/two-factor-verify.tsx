"use client";

import { useState, type FormEvent } from "react";
import { staffAuthClient } from "@/lib/auth/staff-client";
import { reloadTo } from "@/lib/auth/reload-to";
import { Button } from "@/components/ui/button";
import { FormAlert, Input, Label } from "@/components/ui/field";

type Labels = Record<
  "code" | "verify" | "trustDevice" | "useBackupCode" | "useAuthenticator" | "backupCode" | "wrongCode" | "tooMany" | "sessionExpired",
  string
>;

export function TwoFactorVerify({ labels }: { labels: Labels }) {
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim();
    const trustDevice = form.get("trust") === "on";
    setBusy(true);
    const { error: failure } = useBackup
      ? await staffAuthClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await staffAuthClient.twoFactor.verifyTotp({ code: code.replace(/\D/g, ""), trustDevice });
    if (failure) {
      setBusy(false);
      setError(
        failure.status === 429 ? labels.tooMany : failure.status === 401 && !failure.code?.includes("CODE") ? labels.sessionExpired : labels.wrongCode,
      );
      return;
    }
    reloadTo("/admin");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormAlert>{error}</FormAlert>
      <div>
        <Label htmlFor="code">{useBackup ? labels.backupCode : labels.code}</Label>
        <Input
          key={useBackup ? "backup" : "totp"}
          id="code"
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode={useBackup ? "text" : "numeric"}
          maxLength={useBackup ? 24 : 6}
          className={useBackup ? "" : "text-center text-2xl tracking-[0.5em] tabular-nums"}
        />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" name="trust" className="size-5 accent-[var(--primary)]" />
        {labels.trustDevice}
      </label>
      <Button type="submit" disabled={busy} className="w-full">
        {labels.verify}
      </Button>
      <button
        type="button"
        onClick={() => {
          setUseBackup(!useBackup);
          setError(null);
        }}
        className="min-h-11 text-sm text-accent underline underline-offset-4"
      >
        {useBackup ? labels.useAuthenticator : labels.useBackupCode}
      </button>
    </form>
  );
}
