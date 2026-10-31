"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { completeSignUp, requestAccountCode, startSignUp } from "@/lib/actions/account";
import { validateSignUp, type SignUpField, type SignUpProblem } from "@/lib/auth/customer-rules";
import { reloadTo } from "@/lib/auth/reload-to";
import { Button } from "@/components/ui/button";
import { FieldError, FormAlert, Hint, Input, Label } from "@/components/ui/field";
import { CodeStep, codeSendMessage, type AccountLabels } from "./code-step";
import { PasswordInput } from "./password-input";

const PROBLEM_KEYS: Record<SignUpField, Partial<Record<SignUpProblem, string>>> = {
  name: { REQUIRED: "nameRequired", INVALID: "nameInvalid" },
  email: { REQUIRED: "emailRequired", INVALID: "invalidEmail" },
  phone: { REQUIRED: "phoneRequired", INVALID: "invalidPhone" },
  password: {
    REQUIRED: "passwordRequired",
    TOO_SHORT: "passwordTooShort",
    TOO_LONG: "passwordTooLong",
    TOO_COMMON: "passwordTooCommon",
    CONTAINS_EMAIL: "passwordContainsEmail",
  },
};

/**
 * Two steps, and nothing is saved until the second: the details are checked and a code is
 * emailed; the code is checked and the account is saved with the password (DECISIONS.md 64).
 */
export function SignUpForm({ labels, next, terms }: { labels: AccountLabels; next: string; terms: ReactNode }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<SignUpField, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [step, setStep] = useState<{ email: string; resendAfter: number } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const describe = (fields: Partial<Record<SignUpField, SignUpProblem>>) =>
    Object.fromEntries(Object.entries(fields).map(([field, problem]) => [field, labels[PROBLEM_KEYS[field as SignUpField][problem!] ?? "genericError"]]));

  const set = (field: SignUpField) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  function submitDetails(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const { errors: problems } = validateSignUp(form);
    if (Object.keys(problems).length) {
      setErrors(describe(problems));
      document.getElementById(`sign-up-${Object.keys(problems)[0]}`)?.focus();
      return;
    }
    startTransition(async () => {
      const result = await startSignUp(form);
      if (result.ok) {
        setStep({ email: result.email, resendAfter: result.resendAfter });
        setCodeError(null);
      } else if (result.fields) setErrors(describe(result.fields));
      else if (result.error) setMessage(codeSendMessage({ ok: false, error: result.error, retryAfter: result.retryAfter }, labels));
    });
  }

  function submitCode(code: string) {
    setCodeError(null);
    if (!/^\d{6}$/.test(code)) return setCodeError(labels.invalidCode!);
    startTransition(async () => {
      const result = await completeSignUp({ ...form, code });
      if (result.ok) return reloadTo(next);
      if (result.fields) {
        setStep(null);
        setErrors(describe(result.fields));
        return;
      }
      const key = { CODE_INVALID: "codeInvalid", CODE_EXPIRED: "codeExpired", CODE_USED_UP: "codeUsedUp", BUSY: "tooMany", FAILED: "genericError" }[result.error ?? "FAILED"];
      setCodeError(labels[key]!);
    });
  }

  if (step) {
    return (
      <CodeStep
        email={step.email}
        labels={labels}
        resendAfter={step.resendAfter}
        error={codeError}
        busy={pending}
        submitLabel={labels.confirmAndCreate!}
        onSubmit={submitCode}
        onResend={() => requestAccountCode({ email: step.email, purpose: "sign-up" })}
        onChangeEmail={() => setStep(null)}
      />
    );
  }

  const fieldProps = (field: SignUpField) => ({
    id: `sign-up-${field}`,
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": [errors[field] ? `sign-up-${field}-error` : null, field === "phone" || field === "password" ? `sign-up-${field}-hint` : null].filter(Boolean).join(" ") || undefined,
  });

  return (
    <form onSubmit={submitDetails} noValidate className="space-y-5">
      <div>
        <Label htmlFor="sign-up-name">{labels.nameLabel}</Label>
        <Input {...fieldProps("name")} autoComplete="name" maxLength={80} value={form.name} onChange={(event) => set("name")(event.target.value)} />
        <FieldError id="sign-up-name-error">{errors.name}</FieldError>
      </div>
      <div>
        <Label htmlFor="sign-up-email">{labels.emailLabel}</Label>
        <Input
          {...fieldProps("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={160}
          value={form.email}
          onChange={(event) => set("email")(event.target.value)}
        />
        <FieldError id="sign-up-email-error">{errors.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="sign-up-phone">{labels.phoneLabel}</Label>
        <div className="flex">
          <span className="flex min-h-11 items-center rounded-l-sm border border-r-0 border-line-strong bg-surface px-3 text-base text-muted">+91</span>
          <Input
            {...fieldProps("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={16}
            value={form.phone}
            onChange={(event) => set("phone")(event.target.value)}
            className="rounded-l-none"
          />
        </div>
        {!errors.phone && <Hint id="sign-up-phone-hint">{labels.phoneHint}</Hint>}
        <FieldError id="sign-up-phone-error">{errors.phone}</FieldError>
      </div>
      <div>
        <Label htmlFor="sign-up-password">{labels.passwordLabel}</Label>
        <PasswordInput
          {...fieldProps("password")}
          autoComplete="new-password"
          maxLength={128}
          value={form.password}
          onValueChange={set("password")}
          email={form.email}
          showStrength
          labels={{
            show: labels.showPassword!,
            hide: labels.hidePassword!,
            showShort: labels.showShort!,
            hideShort: labels.hideShort!,
            strength: labels.strength,
            levels: [labels.strength1!, labels.strength2!, labels.strength3!, labels.strength4!],
          }}
        />
        {!errors.password && <Hint id="sign-up-password-hint">{labels.passwordHint}</Hint>}
        <FieldError id="sign-up-password-error">{errors.password}</FieldError>
      </div>
      {message && <FormAlert>{message}</FormAlert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.sendingCode : labels.continue}
      </Button>
      <p className="text-sm text-muted">{terms}</p>
      <p className="text-sm">
        {labels.haveAccount}{" "}
        <Link href={`/account/sign-in?next=${encodeURIComponent(next)}`} prefetch={false} className="text-link hover:text-accent underline underline-offset-4">
          {labels.signIn}
        </Link>
      </p>
    </form>
  );
}
