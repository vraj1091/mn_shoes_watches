"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { CodeSendResult } from "@/lib/auth/account-codes";
import { fill } from "@/lib/format/template";
import { Button } from "@/components/ui/button";
import { FieldError, FormAlert, Input, Label } from "@/components/ui/field";

export type AccountLabels = Record<string, string>;

/** The shopper-facing sentence for a failed code request. */
export function codeSendMessage(result: Exclude<CodeSendResult, { ok: true }>, labels: AccountLabels): string {
  if (result.error === "INVALID_EMAIL") return labels.invalidEmail!;
  if (result.error === "WAIT") return fill(labels.waitSeconds!, { seconds: result.retryAfter ?? 60 });
  if (result.error === "EMAIL_FAILED") return labels.emailFailed!;
  return labels.tooMany!;
}

/** Counts down from `seconds` to 0, one second at a time. */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return [left, setLeft] as const;
}

/**
 * "Check your email": the 6-digit code box, a resend button that waits 60 seconds between
 * codes, and plain messages for a wrong, expired or used-up code. Extra fields (a new password)
 * can go above the button.
 */
export function CodeStep({
  email,
  sentText,
  labels,
  resendAfter,
  error,
  busy,
  submitLabel,
  onSubmit,
  onResend,
  onChangeEmail,
  children,
}: {
  email: string;
  /** Replaces "We sent a code to …" where saying so would reveal whether the email is registered. */
  sentText?: string;
  labels: AccountLabels;
  resendAfter: number;
  error: string | null;
  busy: boolean;
  submitLabel: string;
  onSubmit: (code: string) => void;
  onResend: () => Promise<CodeSendResult>;
  onChangeEmail: () => void;
  children?: ReactNode;
}) {
  const [code, setCode] = useState("");
  const [left, setLeft] = useCountdown(resendAfter);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [resending, setResending] = useState(false);

  async function resend() {
    setResending(true);
    setNotice(null);
    const result = await onResend();
    setResending(false);
    if (result.ok) {
      setLeft(result.resendAfter);
      setCode("");
      setNotice({ tone: "success", text: labels.codeResent! });
    } else {
      if (result.error === "WAIT" && result.retryAfter) setLeft(result.retryAfter);
      setNotice({ tone: "error", text: codeSendMessage(result, labels) });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(code);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <h2 className="font-display text-2xl">{labels.checkEmailTitle}</h2>
        <p className="mt-2 text-base" role="status">
          {sentText ?? fill(labels.checkEmailSent!, { email })}
        </p>
        <p className="mt-1 text-sm text-muted">{labels.checkEmailHint}</p>
      </div>
      <div>
        <Label htmlFor="account-code">{labels.codeLabel}</Label>
        <Input
          id="account-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "account-code-error" : undefined}
          className="text-center text-2xl tracking-[0.5em] tabular-nums"
        />
        <FieldError id="account-code-error">{error}</FieldError>
      </div>
      {children}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? labels.verifying : submitLabel}
      </Button>
      {notice && <FormAlert tone={notice.tone}>{notice.text}</FormAlert>}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onChangeEmail} className="min-h-11 text-link hover:text-accent underline underline-offset-4">
          {labels.changeEmail}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={left > 0 || resending}
          className="min-h-11 text-link hover:text-accent underline underline-offset-4 disabled:text-muted disabled:no-underline"
        >
          {left > 0 ? fill(labels.resendIn!, { seconds: left }) : labels.resend}
        </button>
      </div>
    </form>
  );
}
