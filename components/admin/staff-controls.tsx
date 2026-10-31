"use client";

import { useId, useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";
import { useToast } from "./toast";

type Result = { ok: boolean; message: string };
type Role = { value: string; label: string };

/**
 * The actions on one staff row. Each runs a server action (which refreshes the list) and shows its
 * answer as a toast. Switching an account off or resetting two-step sign-in asks once more first.
 */
export function StaffControls({
  name,
  role,
  roles,
  active,
  invitePending,
  twoFactor,
  changeRole,
  setActive,
  sendLink,
  resetTwoFactor,
}: {
  name: string;
  role: string;
  roles: Role[];
  active: boolean;
  invitePending: boolean;
  twoFactor: boolean;
  changeRole: (role: string) => Promise<Result>;
  setActive: (active: boolean) => Promise<Result>;
  sendLink: () => Promise<Result>;
  resetTwoFactor: () => Promise<Result>;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState(role);
  const [confirming, setConfirming] = useState<"off" | "two-factor" | null>(null);
  const selectId = useId();

  function run(work: () => Promise<Result>) {
    startTransition(async () => {
      const result = await work();
      toast?.(result.message, result.ok ? "success" : "error");
      setConfirming(null);
    });
  }

  if (confirming) {
    const question =
      confirming === "off"
        ? `Switch off ${name}’s account? They are signed out at once and cannot sign in until you switch it back on.`
        : `Reset ${name}’s two-step sign-in? Their authenticator and backup codes stop working; they set up a new one at next sign-in.`;
    return (
      <div role="group" aria-label={question} className="max-w-sm rounded-md border border-line bg-surface p-3">
        <p className="text-sm">{question}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(confirming === "off" ? () => setActive(false) : resetTwoFactor)}
            className={buttonClasses("danger", "sm")}
          >
            {pending ? "Working…" : confirming === "off" ? "Switch off" : "Reset"}
          </button>
          <button type="button" onClick={() => setConfirming(null)} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={selectId}>
        Role for {name}
      </label>
      <select id={selectId} value={chosen} onChange={(event) => setChosen(event.target.value)} disabled={pending} className={`${inputClasses} w-auto`}>
        {roles.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {chosen !== role && (
        <button type="button" disabled={pending} onClick={() => run(() => changeRole(chosen))} className={buttonClasses("primary", "sm")}>
          Change role
        </button>
      )}
      {active && (
        <button type="button" disabled={pending} onClick={() => run(sendLink)} className={buttonClasses("secondary", "sm")}>
          {invitePending ? "Send invite again" : "Send password link"}
        </button>
      )}
      {twoFactor && (
        <button type="button" disabled={pending} onClick={() => setConfirming("two-factor")} className={buttonClasses("secondary", "sm")}>
          Reset two-step sign-in
        </button>
      )}
      {active ? (
        <button type="button" disabled={pending} onClick={() => setConfirming("off")} className={buttonClasses("secondary", "sm", "text-sale")}>
          Switch off
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={() => run(() => setActive(true))} className={buttonClasses("secondary", "sm")}>
          Switch on
        </button>
      )}
    </div>
  );
}
