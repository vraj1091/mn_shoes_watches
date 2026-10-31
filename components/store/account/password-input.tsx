"use client";

import { useId, useState, type ComponentProps } from "react";
import { passwordStrength } from "@/lib/auth/customer-rules";
import { fill } from "@/lib/format/template";
import { inputClasses } from "@/components/ui/field";

type Labels = { show: string; hide: string; showShort: string; hideShort: string; strength?: string; levels?: [string, string, string, string] };

/**
 * A password field with a Show/Hide button and, for new passwords, a strength hint. The hint
 * only guides; the rule that blocks a weak password lives in lib/auth/customer-rules.ts.
 */
export function PasswordInput({
  labels,
  showStrength = false,
  email,
  value,
  onValueChange,
  ...props
}: Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  labels: Labels;
  showStrength?: boolean;
  email?: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const strengthId = useId();
  const level = passwordStrength(value, { email });
  const describedBy = [props["aria-describedby"], showStrength && value ? strengthId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-describedby={describedBy}
          className={`${inputClasses} pr-20`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={visible ? labels.hide : labels.show}
          className="absolute inset-y-0 right-0 flex min-w-16 items-center justify-center px-3 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {visible ? labels.hideShort : labels.showShort}
        </button>
      </div>
      {showStrength && labels.strength && labels.levels && value && (
        <div id={strengthId} className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((step) => (
              <span key={step} className={`h-1 flex-1 rounded-full ${step <= level ? (level <= 1 ? "bg-sale" : level === 2 ? "bg-ink/60" : "bg-stock") : "bg-line"}`} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{fill(labels.strength, { level: labels.levels[Math.max(0, level - 1)] ?? "" })}</p>
        </div>
      )}
    </div>
  );
}
