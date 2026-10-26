"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { checkDelivery, type DeliveryCheck } from "@/lib/actions/shop";
import { formatPrice } from "@/lib/format/money";
import { fill } from "@/lib/format/template";

export type PinLabels = {
  title: string;
  label: string;
  check: string;
  invalid: string;
  unserviceable: string;
  result: string;
  cod: string;
  noCod: string;
  free: string;
  busy: string;
};

const STORAGE_KEY = "mn-pin";

/** Delivery date and COD for a PIN code. The last PIN is remembered on this device and checked again. */
export function PinCheck({ labels }: { labels: PinLabels }) {
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<DeliveryCheck | null>(null);
  const [pending, startTransition] = useTransition();

  function run(pin: string) {
    startTransition(async () => {
      const outcome = await checkDelivery(pin);
      setResult(outcome);
      if (outcome.ok) {
        try {
          localStorage.setItem(STORAGE_KEY, outcome.pin);
        } catch {
          // Storage blocked: the check still works for this page.
        }
      }
    });
  }

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (saved && /^[1-8]\d{5}$/.test(saved) && input.current) {
      input.current.value = saved;
      run(saved);
    }
    // Runs once, for the remembered PIN.
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pin = (input.current?.value ?? "").replace(/\D/g, "");
    if (!/^[1-8]\d{5}$/.test(pin)) {
      setResult({ ok: false, reason: "INVALID" });
      return;
    }
    run(pin);
  }

  const message = !result
    ? null
    : result.ok
      ? null
      : result.reason === "INVALID"
        ? labels.invalid
        : result.reason === "BUSY"
          ? labels.busy
          : labels.unserviceable;

  return (
    <section aria-labelledby="pin-title" className="rounded-md border border-line p-4">
      <h2 id="pin-title" className="text-sm font-semibold">
        {labels.title}
      </h2>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <label htmlFor="pin-code" className="sr-only">
          {labels.label}
        </label>
        <input
          ref={input}
          id="pin-code"
          name="pin"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder={labels.label}
          aria-describedby="pin-result"
          className="block min-h-11 w-full rounded-sm border border-line-strong bg-canvas px-3 text-base tabular-nums placeholder:text-muted"
        />
        <button type="submit" disabled={pending} className="min-h-11 shrink-0 rounded-sm border border-line px-4 text-sm font-medium hover:border-line-strong hover:bg-surface">
          {labels.check}
        </button>
      </form>
      <div id="pin-result" aria-live="polite" className="mt-2 text-sm">
        {result?.ok && (
          <ul className="space-y-1">
            <li className="font-medium">
              {fill(labels.result, { range: result.from === result.to ? result.from : `${result.from} – ${result.to}`, pin: result.pin })}
              {result.place && <span className="font-normal text-muted"> ({result.place})</span>}
            </li>
            <li className={result.cod ? "text-stock" : "text-muted"}>{result.cod ? labels.cod : labels.noCod}</li>
            {result.freeAbove !== null && <li className="text-muted">{fill(labels.free, { amount: formatPrice(result.freeAbove) })}</li>}
          </ul>
        )}
        {message && (
          <p role="alert" className="text-sale">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
