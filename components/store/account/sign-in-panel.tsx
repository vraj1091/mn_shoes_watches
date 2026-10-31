"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { requestAccountCode } from "@/lib/actions/account";
import { customerAuthClient } from "@/lib/auth/customer-client";
import { EMAIL_PATTERN } from "@/lib/auth/customer-rules";
import { reloadTo } from "@/lib/auth/reload-to";
import { formatIndianMobile, normaliseIndianMobile } from "@/lib/format/phone";
import { fill } from "@/lib/format/template";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldError, FormAlert, Input, Label } from "@/components/ui/field";
import { CodeStep, codeSendMessage, type AccountLabels } from "./code-step";
import { PasswordInput } from "./password-input";

type Mode = "password" | "code" | "phone";
type AuthError = { status?: number; code?: string; message?: string } | null | undefined;

/** Turns a Better Auth error into the sentence the shopper sees. */
export function authErrorMessage(error: AuthError, labels: AccountLabels): string {
  const code = error?.code ?? "";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return labels.wrongPassword!;
  if (code === "EMAIL_NOT_VERIFIED") return labels.notVerified!;
  if (code === "INVALID_OTP") return labels.codeInvalid!;
  if (code === "OTP_EXPIRED") return labels.codeExpired!;
  if (code === "TOO_MANY_ATTEMPTS" && error?.status === 403) return labels.codeUsedUp!;
  if (error?.status === 429 || code === "TOO_MANY_ATTEMPTS") return labels.tooMany!;
  if (code.startsWith("PASSWORD_")) return labels[{ PASSWORD_TOO_SHORT: "passwordTooShort", PASSWORD_TOO_LONG: "passwordTooLong", PASSWORD_TOO_COMMON: "passwordTooCommon", PASSWORD_CONTAINS_EMAIL: "passwordContainsEmail" }[code] ?? "passwordTooShort"]!;
  return labels.genericError!;
}

export function SignInPanel({
  labels,
  next,
  googleEnabled,
  phoneEnabled,
  icons,
}: {
  labels: AccountLabels;
  next: string;
  googleEnabled: boolean;
  phoneEnabled: boolean;
  icons: { email: ReactNode; phone: ReactNode; google: ReactNode; key: ReactNode };
}) {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");

  return (
    <div className="space-y-6">
      {mode === "password" && <PasswordForm labels={labels} next={next} email={email} onEmail={setEmail} />}
      {mode === "code" && <EmailCodeForm labels={labels} next={next} email={email} onEmail={setEmail} />}
      {mode === "phone" && <PhoneCodeForm labels={labels} next={next} />}

      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        {labels.or}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="space-y-3">
        {mode !== "password" && (
          <button type="button" onClick={() => setMode("password")} className={buttonClasses("secondary", "md", "w-full")}>
            {icons.key}
            {labels.usePassword}
          </button>
        )}
        {mode !== "code" && (
          <button type="button" onClick={() => setMode("code")} className={buttonClasses("secondary", "md", "w-full")}>
            {icons.email}
            {labels.useCode}
          </button>
        )}
        {phoneEnabled && mode !== "phone" && (
          <button type="button" onClick={() => setMode("phone")} className={buttonClasses("secondary", "md", "w-full")}>
            {icons.phone}
            {labels.usePhone}
          </button>
        )}
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
      </div>
      <p className="text-sm">
        {labels.newHere}{" "}
        <Link href={`/account/sign-up?next=${encodeURIComponent(next)}`} prefetch={false} className="text-link hover:text-accent underline underline-offset-4">
          {labels.createAccount}
        </Link>
      </p>
    </div>
  );
}

function PasswordForm({ labels, next, email, onEmail }: { labels: AccountLabels; next: string; email: string; onEmail: (value: string) => void }) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    const problems = {
      email: !address ? labels.emailRequired : !EMAIL_PATTERN.test(address) ? labels.invalidEmail : undefined,
      password: !password ? labels.passwordRequired : undefined,
    };
    if (problems.email || problems.password) return setErrors(problems);
    setErrors({});
    startTransition(async () => {
      const result = await customerAuthClient.signIn.email({ email: address, password, rememberMe: remember });
      if (result.error) return setErrors({ form: authErrorMessage(result.error, labels) });
      reloadTo(next);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <Label htmlFor="sign-in-email">{labels.emailLabel}</Label>
        <Input
          id="sign-in-email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "sign-in-email-error" : undefined}
        />
        <FieldError id="sign-in-email-error">{errors.email}</FieldError>
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="sign-in-password" className="block text-sm font-medium text-ink">
            {labels.passwordLabel}
          </label>
          <Link
            href={`/account/forgot-password?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email.trim())}` : ""}`}
            prefetch={false}
            className="text-sm text-link hover:text-accent underline underline-offset-4"
          >
            {labels.forgotPassword}
          </Link>
        </div>
        <PasswordInput
          id="sign-in-password"
          name="password"
          autoComplete="current-password"
          value={password}
          onValueChange={setPassword}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "sign-in-password-error" : undefined}
          labels={{ show: labels.showPassword!, hide: labels.hidePassword!, showShort: labels.showShort!, hideShort: labels.hideShort! }}
        />
        <FieldError id="sign-in-password-error">{errors.password}</FieldError>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-5 accent-[var(--link)]" />
        {labels.rememberMe}
      </label>
      {errors.form && <FormAlert>{errors.form}</FormAlert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.signingIn : labels.signIn}
      </Button>
    </form>
  );
}

function EmailCodeForm({ labels, next, email, onEmail }: { labels: AccountLabels; next: string; email: string; onEmail: (value: string) => void }) {
  const [step, setStep] = useState<{ email: string; resendAfter: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(event: FormEvent) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(address)) return setError(address ? labels.invalidEmail! : labels.emailRequired!);
    setError(null);
    startTransition(async () => {
      const result = await requestAccountCode({ email: address, purpose: "sign-in" });
      if (result.ok) setStep({ email: address, resendAfter: result.resendAfter });
      else setError(codeSendMessage(result, labels));
    });
  }

  function verify(code: string) {
    if (!step) return;
    if (!/^\d{6}$/.test(code)) return setError(labels.invalidCode!);
    setError(null);
    startTransition(async () => {
      const result = await customerAuthClient.signIn.emailOtp({ email: step.email, otp: code });
      if (result.error) return setError(authErrorMessage(result.error, labels));
      reloadTo(next);
    });
  }

  if (step) {
    return (
      <CodeStep
        email={step.email}
        labels={labels}
        resendAfter={step.resendAfter}
        error={error}
        busy={pending}
        submitLabel={labels.verify!}
        onSubmit={verify}
        onResend={() => requestAccountCode({ email: step.email, purpose: "sign-in" })}
        onChangeEmail={() => {
          setStep(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={send} noValidate className="space-y-5">
      <div>
        <Label htmlFor="code-email">{labels.emailLabel}</Label>
        <Input
          id="code-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-email-error" : undefined}
        />
        <FieldError id="code-email-error">{error}</FieldError>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.sending : labels.sendCode}
      </Button>
    </form>
  );
}

/** Sign-in with an SMS code, offered only when MSG91 is set up. */
function PhoneCodeForm({ labels, next }: { labels: AccountLabels; next: string }) {
  const [value, setValue] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(event?: FormEvent) {
    event?.preventDefault();
    const number = normaliseIndianMobile(target ?? value);
    if (!number) return setError(labels.invalidPhone!);
    setError(null);
    startTransition(async () => {
      const result = await customerAuthClient.phoneNumber.sendOtp({ phoneNumber: number });
      if (result.error) return setError(authErrorMessage(result.error, labels));
      setTarget(number);
      setCode("");
    });
  }

  function verify(event: FormEvent) {
    event.preventDefault();
    if (!target) return;
    if (!/^\d{6}$/.test(code)) return setError(labels.invalidCode!);
    startTransition(async () => {
      const result = await customerAuthClient.phoneNumber.verify({ phoneNumber: target, code });
      if (result.error) return setError(authErrorMessage(result.error, labels));
      reloadTo(next);
    });
  }

  if (target) {
    return (
      <form onSubmit={verify} noValidate className="space-y-5">
        <p className="text-base" role="status">
          {fill(labels.codeSentPhone!, { target: formatIndianMobile(target) })}
        </p>
        <div>
          <Label htmlFor="phone-code">{labels.codeLabel}</Label>
          <Input
            id="phone-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "phone-code-error" : undefined}
            className="text-center text-2xl tracking-[0.5em] tabular-nums"
          />
          <FieldError id="phone-code-error">{error}</FieldError>
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? labels.verifying : labels.verify}
        </Button>
        <button type="button" onClick={() => setTarget(null)} className="min-h-11 text-sm text-link hover:text-accent underline underline-offset-4">
          {labels.changeTarget}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={send} noValidate className="space-y-5">
      <div>
        <Label htmlFor="phone-number">{labels.phoneLabel}</Label>
        <div className="flex">
          <span className="flex min-h-11 items-center rounded-l-sm border border-r-0 border-line-strong bg-surface px-3 text-base text-muted">+91</span>
          <Input
            id="phone-number"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "phone-number-error" : undefined}
            className="rounded-l-none"
          />
        </div>
        <FieldError id="phone-number-error">{error}</FieldError>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.sending : labels.sendCode}
      </Button>
    </form>
  );
}
