"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { checkDelivery, confirmPayment, getCheckoutTotals, submitOrder, type DeliveryCheck } from "@/lib/actions/shop";
import type { CartView } from "@/lib/cart/cart";
import { formatPrice } from "@/lib/format/money";
import { fill } from "@/lib/format/template";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";
import { CouponField, TotalsTable, type BagLabels } from "./cart-parts";
import { cartStore } from "./store";

export type CheckoutLabels = Record<
  | "contact" | "email" | "emailHint" | "phone" | "phoneHint" | "address" | "name" | "line1" | "line2" | "landmark" | "city" | "state"
  | "statePick" | "pin" | "deliveryBy" | "payment" | "cod" | "codNote" | "codUnavailable" | "online" | "onlineNote" | "onlineDemo"
  | "onlineDemoNote" | "note" | "summary" | "placeOrder" | "placing" | "pay" | "terms" | "errorFields" | "errorEmpty" | "errorStock"
  | "errorCod" | "errorPayment" | "errorBusy" | "paymentCancelled" | "paymentFailed" | "fieldEmail" | "fieldPhone" | "fieldName"
  | "fieldLine1" | "fieldCity" | "fieldState" | "fieldPin" | "secure",
  string
>;

type Props = {
  initial: CartView;
  labels: CheckoutLabels;
  bag: BagLabels;
  states: { code: string; name: string }[];
  cod: { enabled: boolean; fee: number; max: number | null };
  razorpay: boolean;
  lockIcon: ReactNode;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  order_id: string;
  prefill: { email: string; contact: string; name: string };
  theme: { color: string };
  handler: (response: { razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const FIELD_MESSAGES: Record<string, keyof CheckoutLabels> = {
  email: "fieldEmail",
  phone: "fieldPhone",
  name: "fieldName",
  line1: "fieldLine1",
  city: "fieldCity",
  stateCode: "fieldState",
  pinCode: "fieldPin",
};

/**
 * One-page guest checkout. The server recalculates every price, discount and stock level when the
 * order is placed (lib/orders/place.ts); this form only collects who, where and how to pay.
 */
export function CheckoutForm({ initial, labels, bag, states, cod, razorpay, lockIcon }: Props) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [method, setMethod] = useState<"PREPAID" | "COD">("PREPAID");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryCheck | null>(null);
  const [pending, startTransition] = useTransition();
  const idempotencyKey = useRef<string | null>(null);
  const [stateCode, setStateCode] = useState("");

  const codAllowed = cod.enabled && (cod.max === null || view.totals.grandTotal <= cod.max) && (delivery?.ok ? delivery.cod : true);

  function changeMethod(next: "PREPAID" | "COD") {
    setMethod(next);
    startTransition(async () => setView(await getCheckoutTotals(next)));
  }

  function onPinBlur(value: string) {
    const pin = value.replace(/\D/g, "");
    if (!/^[1-8]\d{5}$/.test(pin)) return;
    startTransition(async () => {
      const result = await checkDelivery(pin);
      setDelivery(result);
      if (result.ok && result.place) {
        const match = states.find((state) => state.name === result.place);
        if (match) setStateCode((current) => current || match.code);
      }
      setView(await getCheckoutTotals(method));
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "");
    idempotencyKey.current ??= crypto.randomUUID();
    setMessage(null);
    startTransition(async () => {
      const result = await submitOrder({
        email: value("email"),
        phone: value("phone"),
        name: value("name"),
        line1: value("line1"),
        line2: value("line2"),
        landmark: value("landmark"),
        city: value("city"),
        stateCode: value("stateCode"),
        pinCode: value("pinCode").replace(/\D/g, ""),
        paymentMethod: method,
        note: value("note"),
        idempotencyKey: idempotencyKey.current!,
      });
      if (!result.ok) {
        if (result.error === "INVALID") {
          setErrors(Object.fromEntries(result.fields.filter((field) => FIELD_MESSAGES[field]).map((field) => [field, labels[FIELD_MESSAGES[field]!]])));
          setMessage(labels.errorFields);
          const first = result.fields.find((field) => FIELD_MESSAGES[field]);
          if (first) document.getElementById(`checkout-${first}`)?.focus();
          return;
        }
        // Another attempt must be allowed after an error that did not create an order.
        idempotencyKey.current = null;
        if (result.error === "STOCK") {
          setMessage(fill(labels.errorStock, { items: result.items.join(", ") }));
          setView(await getCheckoutTotals(method));
          return;
        }
        setMessage(
          result.error === "EMPTY" ? labels.errorEmpty : result.error === "COD_UNAVAILABLE" ? labels.errorCod : result.error === "PAYMENT" ? labels.errorPayment : labels.errorBusy,
        );
        return;
      }
      setErrors({});
      cartStore.set({ cart: null });
      if (!result.razorpay) {
        router.push(`/order/${result.token}`);
        return;
      }
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) {
        setMessage(labels.errorPayment);
        return;
      }
      const token = result.token;
      new window.Razorpay({
        key: result.razorpay.keyId,
        amount: result.razorpay.amount,
        currency: "INR",
        name: result.razorpay.name,
        description: result.razorpay.number,
        order_id: result.razorpay.orderId,
        prefill: { email: result.razorpay.email, contact: result.razorpay.contact, name: value("name") },
        // Razorpay's window takes a plain colour; the brand navy is read from the design tokens.
        theme: { color: getComputedStyle(document.documentElement).getPropertyValue("--color-navy-700").trim() },
        handler: (response) => {
          startTransition(async () => {
            const confirmed = await confirmPayment({ token, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature });
            if (!confirmed.ok) setMessage(labels.paymentFailed);
            router.push(`/order/${token}`);
          });
        },
        modal: { ondismiss: () => router.push(`/order/${token}`) },
      }).open();
    });
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div className={props.className}>
      <label htmlFor={`checkout-${name}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`checkout-${name}`}
        name={name}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `checkout-${name}-error` : hint ? `checkout-${name}-hint` : undefined}
        {...props}
        className={inputClasses}
      />
      {hint && !errors[name] && (
        <p id={`checkout-${name}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {errors[name] && (
        <p id={`checkout-${name}-error`} className="mt-1 text-sm font-medium text-sale">
          {errors[name]}
        </p>
      )}
    </div>
  );

  const section = "rounded-md border border-line bg-raised p-5 sm:p-6";

  return (
    <form onSubmit={submit} noValidate className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
      <div className="space-y-6">
        <div className={section}>
          <fieldset>
            <legend className="mb-4 text-lg font-semibold">{labels.contact}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("email", labels.email, { type: "email", autoComplete: "email", required: true, maxLength: 160 }, labels.emailHint)}
              {field("phone", labels.phone, { type: "tel", autoComplete: "tel-national", inputMode: "tel", required: true, maxLength: 16 }, labels.phoneHint)}
            </div>
          </fieldset>
        </div>

        <div className={section}>
          <fieldset>
            <legend className="mb-4 text-lg font-semibold">{labels.address}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", labels.name, { autoComplete: "name", required: true, maxLength: 80, className: "sm:col-span-2" })}
              {field("line1", labels.line1, { autoComplete: "address-line1", required: true, maxLength: 120, className: "sm:col-span-2" })}
              {field("line2", labels.line2, { autoComplete: "address-line2", maxLength: 120, className: "sm:col-span-2" })}
              {field("landmark", labels.landmark, { maxLength: 80 })}
              {field("pinCode", labels.pin, { autoComplete: "postal-code", inputMode: "numeric", required: true, maxLength: 6, onBlur: (event) => onPinBlur(event.currentTarget.value) })}
              {field("city", labels.city, { autoComplete: "address-level2", required: true, maxLength: 60 })}
              <div>
                <label htmlFor="checkout-stateCode" className="mb-1.5 block text-sm font-medium">
                  {labels.state}
                </label>
                <select
                  id="checkout-stateCode"
                  name="stateCode"
                  autoComplete="address-level1"
                  required
                  value={stateCode}
                  onChange={(event) => setStateCode(event.target.value)}
                  aria-invalid={errors.stateCode ? true : undefined}
                  aria-describedby={errors.stateCode ? "checkout-stateCode-error" : undefined}
                  className={inputClasses}
                >
                  <option value="" disabled>
                    {labels.statePick}
                  </option>
                  {states.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.stateCode && (
                  <p id="checkout-stateCode-error" className="mt-1 text-sm font-medium text-sale">
                    {errors.stateCode}
                  </p>
                )}
              </div>
            </div>
            {delivery?.ok && (
              <p className="mt-4 text-sm font-medium text-stock" role="status">
                {fill(labels.deliveryBy, { range: delivery.from === delivery.to ? delivery.from : `${delivery.from} – ${delivery.to}` })}
              </p>
            )}
          </fieldset>
        </div>

        <div className={section}>
          <fieldset>
            <legend className="mb-4 text-lg font-semibold">{labels.payment}</legend>
            <div className="space-y-3">
              <label className="flex cursor-pointer gap-3 rounded-sm border border-line p-4 has-checked:border-primary has-checked:bg-surface">
                <input type="radio" name="paymentMethod" value="PREPAID" checked={method === "PREPAID"} onChange={() => changeMethod("PREPAID")} className="mt-1 size-5 accent-[var(--link)]" />
                <span>
                  <span className="block font-medium">{razorpay ? labels.online : labels.onlineDemo}</span>
                  <span className="block text-sm text-muted">{razorpay ? labels.onlineNote : labels.onlineDemoNote}</span>
                </span>
              </label>
              <label className={`flex gap-3 rounded-sm border border-line p-4 has-checked:border-primary has-checked:bg-surface ${codAllowed ? "cursor-pointer" : "opacity-60"}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={method === "COD"}
                  disabled={!codAllowed}
                  onChange={() => changeMethod("COD")}
                  className="mt-1 size-5 accent-[var(--link)]"
                />
                <span>
                  <span className="block font-medium">{labels.cod}</span>
                  <span className="block text-sm text-muted">{codAllowed ? fill(labels.codNote, { fee: formatPrice(cod.fee) }) : labels.codUnavailable}</span>
                </span>
              </label>
            </div>
            <div className="mt-4">
              <label htmlFor="checkout-note" className="mb-1.5 block text-sm font-medium">
                {labels.note}
              </label>
              <textarea id="checkout-note" name="note" rows={2} maxLength={300} className={`${inputClasses} py-2`} />
            </div>
          </fieldset>
        </div>
      </div>

      <aside className="mt-8 self-start rounded-md bg-surface p-5 sm:p-6 lg:sticky lg:top-24 lg:mt-0">
        <h2 className="text-lg font-semibold">{labels.summary}</h2>
        <ul className="mt-4 divide-y divide-line">
          {view.lines
            .filter((line) => line.available)
            .map((line) => (
              <li key={line.variantId} className="flex gap-3 py-3">
                <span className="photo-tile relative size-16 shrink-0 overflow-hidden rounded-sm">
                  {line.image && <Image src={line.image.url} alt="" fill sizes="64px" className={line.image.url.endsWith(".svg") ? "object-cover mix-blend-normal" : "object-contain p-1"} />}
                  <span className="price absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-semibold text-on-primary">{line.quantity}</span>
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="line-clamp-2 font-medium">{line.title}</span>
                  {line.variantTitle && <span className="block text-muted">{line.variantTitle}</span>}
                </span>
                <span className="price text-sm font-semibold">{formatPrice(line.lineTotal)}</span>
              </li>
            ))}
        </ul>
        <div className="mt-4 space-y-4">
          <CouponField cart={view} labels={bag} onChange={() => startTransition(async () => setView(await getCheckoutTotals(method)))} />
          <TotalsTable cart={view} labels={bag} />
        </div>
        {message && (
          <p role="alert" className="mt-4 rounded-sm border border-sale/40 bg-raised px-3 py-2 text-sm text-sale">
            {message}
          </p>
        )}
        <button type="submit" disabled={pending || view.count === 0} className={buttonClasses("primary", "md", "mt-5 w-full")}>
          {pending ? labels.placing : method === "PREPAID" && razorpay ? fill(labels.pay, { amount: formatPrice(view.totals.grandTotal) }) : labels.placeOrder}
        </button>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted">
          <span className="mt-0.5 shrink-0">{lockIcon}</span>
          <span>
            {labels.secure}{" "}
            <Link href="/policies/terms" className="underline underline-offset-2">
              {labels.terms}
            </Link>
          </span>
        </p>
      </aside>
    </form>
  );
}
