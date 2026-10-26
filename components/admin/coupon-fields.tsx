"use client";

import { useState } from "react";
import { Checkbox, Field, Select, TextInput } from "./ui";

export type CouponDefaults = {
  code: string;
  title: string;
  publicLabel: string;
  type: "PERCENT" | "FLAT" | "FREE_SHIPPING";
  value: string;
  maxDiscount: string;
  minOrderValue: string;
  usageLimit: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

/** Coupon fields; the amount field changes with the kind of discount. */
export function CouponFields({ coupon }: { coupon: CouponDefaults }) {
  const [type, setType] = useState(coupon.type);
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Code" hint="What shoppers type, e.g. DIWALI10. Letters and numbers only.">
          <TextInput name="code" defaultValue={coupon.code} required pattern="[A-Za-z0-9_\-]{3,32}" className="font-mono uppercase" autoComplete="off" />
        </Field>
        <Field label="Internal name" hint="Optional. Only staff see it.">
          <TextInput name="title" defaultValue={coupon.title} maxLength={80} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Discount">
          <Select name="type" value={type} onChange={(event) => setType(event.target.value as CouponDefaults["type"])}>
            <option value="PERCENT">Percentage off</option>
            <option value="FLAT">Amount off (₹)</option>
            <option value="FREE_SHIPPING">Free delivery</option>
          </Select>
        </Field>
        {type !== "FREE_SHIPPING" && (
          <Field label={type === "PERCENT" ? "Percent off" : "Amount off (₹)"}>
            <TextInput name="value" defaultValue={coupon.value} inputMode="decimal" required placeholder={type === "PERCENT" ? "10" : "500"} />
          </Field>
        )}
        {type === "PERCENT" && (
          <Field label="Cap (₹)" hint="Optional. Most it can take off.">
            <TextInput name="maxDiscount" defaultValue={coupon.maxDiscount} inputMode="decimal" />
          </Field>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Minimum order (₹)" hint="Optional. Bag value before delivery.">
          <TextInput name="minOrderValue" defaultValue={coupon.minOrderValue} inputMode="decimal" />
        </Field>
        <Field label="Total uses allowed" hint="Optional. Empty means no limit.">
          <TextInput name="usageLimit" type="number" min={1} defaultValue={coupon.usageLimit} />
        </Field>
        <Field label="Starts">
          <TextInput name="startsAt" type="date" defaultValue={coupon.startsAt} required />
        </Field>
        <Field label="Ends" hint="Optional. Works until the end of this day (IST).">
          <TextInput name="endsAt" type="date" defaultValue={coupon.endsAt} />
        </Field>
      </div>
      <Field label="Shown to shoppers" hint="Optional, e.g. “₹500 off orders above ₹4,999”. Shown when the code is applied.">
        <TextInput name="publicLabel" defaultValue={coupon.publicLabel} maxLength={120} />
      </Field>
      <Checkbox name="isActive" label="Active" defaultChecked={coupon.isActive} hint="Switch off to stop the code working without deleting it." />
    </div>
  );
}
