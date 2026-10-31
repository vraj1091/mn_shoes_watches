"use client";

import Link from "next/link";
import { useActionState } from "react";
import { trackOrder, type TrackState } from "@/lib/actions/shop";
import { fill } from "@/lib/format/template";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

export type TrackLabels = Record<
  "orderNumber" | "orderNumberHint" | "phone" | "submit" | "invalid" | "notFound" | "busy" | "status" | "placed" | "expected" | "courier" | "timeline" | "viewOrder",
  string
> & { statuses: Record<string, string> };

const day = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });
const dayTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

/** Order number + mobile number → status, delivery estimate and the courier's updates. */
export function TrackForm({ labels, initialOrder }: { labels: TrackLabels; initialOrder: string }) {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, { status: "idle" });
  const error = state.status === "invalid" ? labels.invalid : state.status === "not-found" ? labels.notFound : state.status === "busy" ? labels.busy : null;

  return (
    <div>
      <form action={action} className="mt-8 grid gap-4 rounded-md border border-line p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
        <div>
          <label htmlFor="track-order" className="mb-1.5 block text-sm font-medium">
            {labels.orderNumber}
          </label>
          <input id="track-order" name="order" defaultValue={initialOrder} required autoCapitalize="characters" maxLength={12} aria-describedby="track-order-hint" className={inputClasses} />
          <p id="track-order-hint" className="mt-1 text-xs text-muted">
            {labels.orderNumberHint}
          </p>
        </div>
        <div className="sm:self-start">
          <label htmlFor="track-phone" className="mb-1.5 block text-sm font-medium">
            {labels.phone}
          </label>
          <input id="track-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={16} className={inputClasses} />
        </div>
        <button type="submit" disabled={pending} className={buttonClasses("primary", "md", "sm:mb-5")}>
          {labels.submit}
        </button>
      </form>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-error">
            {error}
          </p>
        )}
        {state.status === "found" && (
          <section aria-labelledby="track-result" className="mt-8 rounded-md bg-surface p-5 sm:p-6">
            <h2 id="track-result" className="text-xl font-semibold">
              {state.order.number}: {labels.statuses[state.order.status] ?? state.order.status}
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {state.order.placedAt && <li>{fill(labels.placed, { date: day.format(state.order.placedAt) })}</li>}
              {state.order.deliveryMinDate && state.order.deliveryMaxDate && !["DELIVERED", "CANCELLED", "RETURNED_TO_ORIGIN"].includes(state.order.status) && (
                <li>
                  {fill(labels.expected, {
                    range:
                      day.format(state.order.deliveryMinDate) === day.format(state.order.deliveryMaxDate)
                        ? day.format(state.order.deliveryMinDate)
                        : `${day.format(state.order.deliveryMinDate)} – ${day.format(state.order.deliveryMaxDate)}`,
                  })}
                </li>
              )}
              {state.order.courier?.awb && <li>{fill(labels.courier, { courier: state.order.courier.name ?? "", awb: state.order.courier.awb })}</li>}
            </ul>
            <ul className="mt-3 text-sm text-muted">
              {state.order.items.map((item) => (
                <li key={`${item.title}-${item.variant}`}>
                  {item.title}
                  {item.variant ? ` (${item.variant})` : ""} × {item.quantity}
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-sm font-semibold">{labels.timeline}</h3>
            <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
              {state.order.timeline.map((entry, index) => (
                <li key={`${entry.label}-${index}`} className="relative text-sm">
                  <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full bg-primary" />
                  <span className="font-medium">{entry.label}</span>
                  <span className="block text-muted">{dayTime.format(entry.at)}</span>
                </li>
              ))}
            </ol>
            <Link href={`/order/${state.order.token}`} className="mt-6 inline-block text-sm text-link hover:text-accent underline underline-offset-4">
              {labels.viewOrder}
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
