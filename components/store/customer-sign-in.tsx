"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { customerAuthClient } from "@/lib/auth/customer-client";
import { reloadTo } from "@/lib/auth/reload-to";
import { fill } from "@/lib/format/template";
import { formatIndianMobile, normaliseIndianMobile } from "@/lib/format/phone";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

type Labels = Record<
  | "emailLabel"
  | "phoneLabel"
  | "sendCode"
  | "sending"
  | "codeLabel"
  | "codeSentEmail"
  | "codeSentPhone"
  | "verify"
  | "verifying"
  | "changeTarget"
  | "resend"
  | "or"
  | "google"
  | "usePhone"
  | "useEmail"
  | "invalidEmail"
  | "invalidPhone"
  | "invalidCode"
  | "wrongCode"
  | "tooMany"
  | "genericError",
  string
>;

type Props = {
  labels: Labels;
  next: string;
  googleEnabled: boolean;
  phoneEnabled: boolean;
  icons: { email: ReactNode; phone: ReactNode; google: ReactNode };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type AuthError = { status?: number; code?: string } | null | undefined;

export function CustomerSignIn({ labels, next, googleEnabled, phoneEnabled, icons }: Props) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [value, setValue] = useState("");
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function explain(failure: AuthError): string {
    if (failure?.status === 429 || failure?.code === "TOO_MANY_ATTEMPTS") return labels.tooMany;
    if (failure?.code && /OTP|CODE/.test(failure.code)) return labels.wrongCode;
    return labels.genericError;
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    let destination: string | null;
    if (mode === "email") {
      destination = value.trim().toLowerCase();
      if (!EMAIL.test(destination)) return setError(labels.invalidEmail);
    } else {
      destination = normaliseIndianMobile(value);
      if (!destination) return setError(labels.invalidPhone);
    }
    setBusy(true);
    const result =
      mode === "email"
        ? await customerAuthClient.emailOtp.sendVerificationOtp({ email: destination, type: "sign-in" })
        : await customerAuthClient.phoneNumber.sendOtp({ phoneNumber: destination });
    setBusy(false);
    if (result.error) return setError(explain(result.error));
    setTarget(destination);
    setCode("");
    setStep("code");
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const otp = code.replace(/\D/g, "");
    if (otp.length !== 6) return setError(labels.invalidCode);
    setBusy(true);
    const result =
      mode === "email"
        ? await customerAuthClient.signIn.emailOtp({ email: target, otp })
        : await customerAuthClient.phoneNumber.verify({ phoneNumber: target, code: otp });
    if (result.error) {
      setBusy(false);
      return setError(explain(result.error));
    }
    reloadTo(next);
  }

  function switchMode(nextMode: "email" | "phone") {
    setMode(nextMode);
    setStep("enter");
    setValue("");
    setError(null);
  }

  if (step === "code") {
    const sentTo = mode === "email" ? target : formatIndianMobile(target);
    return (
      <form onSubmit={verify} noValidate className="space-y-5">
        <p className="text-base" role="status">
          {fill(mode === "email" ? labels.codeSentEmail : labels.codeSentPhone, { target: sentTo })}
        </p>
        <div>
          <Label htmlFor="otp">{labels.codeLabel}</Label>
          <Input
            id="otp"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "otp-error" : undefined}
            className="text-center text-2xl tracking-[0.5em] tabular-nums"
          />
          <FieldError id="otp-error">{error}</FieldError>
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? labels.verifying : labels.verify}
        </Button>
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <button type="button" onClick={() => switchMode(mode)} className="min-h-11 text-link underline underline-offset-4">
            {labels.changeTarget}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setValue(mode === "email" ? target : target.replace(/^\+91/, ""));
              void sendCode();
            }}
            className="min-h-11 text-link underline underline-offset-4 disabled:opacity-60"
          >
            {labels.resend}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={sendCode} noValidate className="space-y-5">
        <div>
          <Label htmlFor="sign-in-target">{mode === "email" ? labels.emailLabel : labels.phoneLabel}</Label>
          {mode === "email" ? (
            <Input
              id="sign-in-target"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "sign-in-error" : undefined}
            />
          ) : (
            <div className="flex">
              <span className="flex min-h-11 items-center rounded-l-sm border border-r-0 border-line-strong bg-surface px-3 text-base text-muted">
                +91
              </span>
              <Input
                id="sign-in-target"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? "sign-in-error" : undefined}
                className="rounded-l-none"
              />
            </div>
          )}
          <FieldError id="sign-in-error">{error}</FieldError>
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? labels.sending : labels.sendCode}
        </Button>
      </form>

      {(googleEnabled || phoneEnabled) && (
        <>
          <div className="flex items-center gap-3 text-sm text-muted" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            {labels.or}
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="space-y-3">
            {googleEnabled && (
              <button
                type="button"
                onClick={() => customerAuthClient.signIn.social({ provider: "google", callbackURL: next })}
                className={buttonClasses("secondary", "md", "w-full")}
              >
                {icons.google}
                {labels.google}
              </button>
            )}
            {phoneEnabled && (
              <button
                type="button"
                onClick={() => switchMode(mode === "email" ? "phone" : "email")}
                className={buttonClasses("secondary", "md", "w-full")}
              >
                {mode === "email" ? icons.phone : icons.email}
                {mode === "email" ? labels.usePhone : labels.useEmail}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
