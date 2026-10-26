"use client";

import { useState } from "react";
import { AdminForm, type FormState } from "./forms";
import { Field, Select, TextInput } from "./ui";

/** The status change for one order: only the next allowed steps, plus courier details when shipping. */
export function OrderStatusForm({
  action,
  options,
  hasShipment,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  options: { value: string; label: string }[];
  hasShipment: boolean;
}) {
  const [status, setStatus] = useState(options[0]?.value ?? "");
  // After a change the next allowed steps are different; start from the first of them.
  if (options.length > 0 && !options.some((option) => option.value === status)) setStatus(options[0]!.value);
  return (
    <AdminForm action={action} submitLabel="Update status">
      <div className="grid gap-4">
        <Field label="New status">
          <Select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        {status === "SHIPPED" && !hasShipment && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Courier">
              <TextInput name="courier" placeholder="Delhivery" autoComplete="off" />
            </Field>
            <Field label="AWB / tracking number">
              <TextInput name="awb" autoComplete="off" />
            </Field>
            <Field label="Tracking link" hint="Optional. Shown to the customer on the tracking page." className="sm:col-span-2">
              <TextInput name="trackingUrl" type="url" inputMode="url" placeholder="https://" />
            </Field>
          </div>
        )}
        <Field
          label={status === "CANCELLED" ? "Reason for cancelling" : "Note"}
          hint={status === "CANCELLED" ? "Kept on the order. Stock goes back on the shelf." : "Optional. Added to the timeline."}
        >
          <TextInput name="note" maxLength={500} autoComplete="off" />
        </Field>
      </div>
    </AdminForm>
  );
}
