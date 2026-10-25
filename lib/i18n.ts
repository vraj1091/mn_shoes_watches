import "server-only";
import en from "@/messages/en.json";
import { fill } from "@/lib/format/template";

/**
 * Every customer-facing string lives in messages/<locale>.json (Part 4: ready for Hindi and
 * Gujarati, launching in English). Server components call t(); client components receive the
 * strings they need as props, so message files never end up in the browser bundle.
 */

type Messages = typeof en;

type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Namespace = keyof Messages;

export const LOCALE = "en-IN";

const catalogues: Record<string, Messages> = { en };

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function t(key: MessageKey, values?: Record<string, string | number>, locale = "en"): string {
  const template = lookup(catalogues[locale] ?? en, key) ?? lookup(en, key) ?? key;
  return values ? fill(template, values) : template;
}

/** All strings of one namespace, for handing to a client component as a prop. */
export function messages<N extends Namespace>(namespace: N, locale = "en"): Messages[N] {
  return (catalogues[locale] ?? en)[namespace];
}
