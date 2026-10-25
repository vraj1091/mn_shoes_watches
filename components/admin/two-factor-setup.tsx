"use client";

import { useState, type FormEvent } from "react";
import { staffAuthClient } from "@/lib/auth/staff-client";
import { reloadTo } from "@/lib/auth/reload-to";
import { totpQrCode } from "@/lib/actions/admin-security";
import { Button } from "@/components/ui/button";
import { FormAlert, Hint, Input, Label } from "@/components/ui/field";

type Step = { kind: "password" } | { kind: "scan"; qr: string; secret: string; backupCodes: string[] } | { kind: "backup"; backupCodes: string[] };

/** Owner and Manager must finish this before the admin opens (DECISIONS.md 2). */
export function TwoFactorSetup() {
  const [step, setStep] = useState<Step>({ kind: "password" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const { data, error: failure } = await staffAuthClient.twoFactor.enable({ password, method: "totp" });
    if (failure || !data || data.method !== "totp") {
      setBusy(false);
      setError(failure?.status === 400 || failure?.status === 401 ? "That password is not right." : "Could not start set-up. Please try again.");
      return;
    }
    const secret = new URL(data.totpURI).searchParams.get("secret") ?? "";
    const qr = await totpQrCode(data.totpURI);
    setBusy(false);
    setStep({ kind: "scan", qr, secret, backupCodes: data.backupCodes });
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.kind !== "scan") return;
    setError(null);
    setBusy(true);
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\D/g, "");
    const { error: failure } = await staffAuthClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (failure) {
      setError("That code is not right. Codes change every 30 seconds; enter the current one.");
      return;
    }
    setStep({ kind: "backup", backupCodes: step.backupCodes });
  }

  if (step.kind === "password") {
    return (
      <form onSubmit={start} className="max-w-sm space-y-4">
        <FormAlert>{error}</FormAlert>
        <div>
          <Label htmlFor="tf-password">Your password</Label>
          <Input id="tf-password" name="password" type="password" autoComplete="current-password" required />
          <Hint>Confirms it is you before the set-up starts.</Hint>
        </div>
        <Button type="submit" disabled={busy}>
          Start set-up
        </Button>
      </form>
    );
  }

  if (step.kind === "scan") {
    return (
      <div className="grid gap-8 md:grid-cols-[13rem_1fr]">
        <div>
          <div
            className="w-52 overflow-hidden rounded-md border border-line"
            role="img"
            aria-label="QR code for your authenticator app"
            dangerouslySetInnerHTML={{ __html: step.qr }}
          />
          <p className="mt-3 text-sm text-muted">Can&apos;t scan? Type this key instead:</p>
          <p className="mt-1 font-mono text-sm break-all select-all">{step.secret}</p>
        </div>
        <form onSubmit={confirm} className="max-w-sm space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-base">
            <li>Open Google Authenticator, Microsoft Authenticator or a similar app on your phone.</li>
            <li>Add an account and scan the QR code.</li>
            <li>Type the 6-digit code the app shows.</li>
          </ol>
          <FormAlert>{error}</FormAlert>
          <div>
            <Label htmlFor="tf-code">6-digit code</Label>
            <Input
              id="tf-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              className="text-center text-2xl tracking-[0.5em] tabular-nums"
            />
          </div>
          <Button type="submit" disabled={busy}>
            Turn on two-factor
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormAlert tone="success">Two-factor sign-in is on.</FormAlert>
      <div>
        <h3 className="text-base font-semibold">Save these backup codes</h3>
        <p className="mt-1 max-w-prose text-sm text-muted">
          If you lose your phone, each code lets you sign in once. Print them or keep them somewhere safe. They are shown only now.
        </p>
        <ul className="mt-4 grid max-w-md grid-cols-2 gap-2 font-mono text-sm tabular-nums">
          {step.backupCodes.map((code) => (
            <li key={code} className="rounded-sm border border-line px-3 py-2">
              {code}
            </li>
          ))}
        </ul>
      </div>
      <Button
        onClick={() => {
          reloadTo("/admin");
        }}
      >
        I have saved them
      </Button>
    </div>
  );
}
