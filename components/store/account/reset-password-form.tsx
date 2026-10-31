"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { requestAccountCode } from "@/lib/actions/account";
import { customerAuthClient } from "@/lib/auth/customer-client";
import { EMAIL_PATTERN, passwordProblem } from "@/lib/auth/customer-rules";
import { reloadTo } from "@/lib/auth/reload-to";
import { fill } from "@/lib/format/template";
import { Button } from "@/components/ui/button";
import { FieldError, Hint, Input, Label } from "@/components/ui/field";
import { CodeStep, codeSendMessage, type AccountLabels } from "./code-step";
import { PasswordInput } from "./password-input";
import { authErrorMessage } from "./sign-in-panel";

const PASSWORD_KEYS = { TOO_SHORT: "passwordTooShort", TOO_LONG: "passwordTooLong", TOO_COMMON: "passwordTooCommon", CONTAINS_EMAIL: "passwordContainsEmail" } as const;

/**
 * Forgot password: an emailed code plus the new password, then straight in. Also how a guest
 * buyer, or someone who only ever used codes, sets a first password.
 */
export function ResetPasswordForm({ labels, next, initialEmail }: { labels: AccountLabels; next: string; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<{ email: string; resendAfter: number } | null>(null);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; code?: string; password?: string }>({});
  const [pending, startTransition] = useTransition();

  function send(event: FormEvent) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(address)) return setErrors({ email: address ? labels.invalidEmail : labels.emailRequired });
    setErrors({});
    startTransition(async () => {
      const result = await requestAccountCode({ email: address, purpose: "reset" });
      if (result.ok) setStep({ email: address, resendAfter: result.resendAfter });
      else setErrors({ email: codeSendMessage(result, labels) });
    });
  }

  function save(code: string) {
    if (!step) return;
    const problems: typeof errors = {};
    if (!/^\d{6}$/.test(code)) problems.code = labels.invalidCode;
    const weak = password ? passwordProblem(password, { email: step.email }) : null;
    if (!password) problems.password = labels.passwordRequired;
    else if (weak) problems.password = labels[PASSWORD_KEYS[weak]];
    setErrors(problems);
    if (problems.code || problems.password) return;
    startTransition(async () => {
      const reset = await customerAuthClient.emailOtp.resetPassword({ email: step.email, otp: code, password });
      if (reset.error) {
        const message = authErrorMessage(reset.error, labels);
        return setErrors(reset.error.code?.startsWith("PASSWORD_") ? { password: message } : { code: message });
      }
      const signedIn = await customerAuthClient.signIn.email({ email: step.email, password, rememberMe: true });
      if (signedIn.error) return reloadTo(`/account/sign-in?next=${encodeURIComponent(next)}`);
      reloadTo(next);
    });
  }

  if (step) {
    return (
      <CodeStep
        email={step.email}
        sentText={fill(labels.resetSent!, { email: step.email })}
        labels={labels}
        resendAfter={step.resendAfter}
        error={errors.code ?? null}
        busy={pending}
        submitLabel={labels.savePassword!}
        onSubmit={save}
        onResend={() => requestAccountCode({ email: step.email, purpose: "reset" })}
        onChangeEmail={() => setStep(null)}
      >
        <div>
          <Label htmlFor="reset-password">{labels.newPasswordLabel}</Label>
          <PasswordInput
            id="reset-password"
            name="password"
            autoComplete="new-password"
            maxLength={128}
            value={password}
            onValueChange={setPassword}
            email={step.email}
            showStrength
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "reset-password-error" : "reset-password-hint"}
            labels={{
              show: labels.showPassword!,
              hide: labels.hidePassword!,
              showShort: labels.showShort!,
              hideShort: labels.hideShort!,
              strength: labels.strength,
              levels: [labels.strength1!, labels.strength2!, labels.strength3!, labels.strength4!],
            }}
          />
          {!errors.password && <Hint id="reset-password-hint">{labels.passwordHint}</Hint>}
          <FieldError id="reset-password-error">{errors.password}</FieldError>
        </div>
      </CodeStep>
    );
  }

  return (
    <form onSubmit={send} noValidate className="space-y-5">
      <div>
        <Label htmlFor="reset-email">{labels.emailLabel}</Label>
        <Input
          id="reset-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "reset-email-error" : undefined}
        />
        <FieldError id="reset-email-error">{errors.email}</FieldError>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.sending : labels.sendCodeShort}
      </Button>
      <Link href={`/account/sign-in?next=${encodeURIComponent(next)}`} prefetch={false} className="inline-flex min-h-11 items-center text-sm text-link underline underline-offset-4">
        {labels.backToSignIn}
      </Link>
    </form>
  );
}
