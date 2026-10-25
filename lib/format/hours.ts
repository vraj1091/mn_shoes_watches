import { z } from "zod";

export const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
export type Day = (typeof DAYS)[number];

export const openingHoursSchema = z.array(
  z.object({
    days: z.array(z.enum(DAYS)).min(1),
    opens: z.string().regex(/^\d{2}:\d{2}$/),
    closes: z.string().regex(/^\d{2}:\d{2}$/),
  }),
);
export type OpeningHours = z.infer<typeof openingHoursSchema>;

const DAY_NAMES: Record<Day, string> = {
  Mo: "Mon",
  Tu: "Tue",
  We: "Wed",
  Th: "Thu",
  Fr: "Fri",
  Sa: "Sat",
  Su: "Sun",
};

function to12h(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function describeDays(days: readonly Day[]): string {
  const order = (day: Day) => DAYS.indexOf(day);
  const sorted = [...new Set(days)].sort((a, b) => order(a) - order(b));
  const consecutive = sorted.every((day, i) => i === 0 || order(day) === order(sorted[i - 1]!) + 1);
  if (sorted.length > 2 && consecutive) return `${DAY_NAMES[sorted[0]!]}–${DAY_NAMES[sorted[sorted.length - 1]!]}`;
  return sorted.map((day) => DAY_NAMES[day]).join(", ");
}

/** "Mon–Sat 10 am–9 pm" style lines for the footer and store page. */
export function describeOpeningHours(hours: OpeningHours): string[] {
  return hours.map(({ days, opens, closes }) => `${describeDays(days)} ${to12h(opens)}–${to12h(closes)}`);
}

/** schema.org openingHoursSpecification for the LocalBusiness JSON-LD. */
export function openingHoursSpecification(hours: OpeningHours) {
  const schemaDays: Record<Day, string> = {
    Mo: "Monday",
    Tu: "Tuesday",
    We: "Wednesday",
    Th: "Thursday",
    Fr: "Friday",
    Sa: "Saturday",
    Su: "Sunday",
  };
  return hours.map(({ days, opens, closes }) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: days.map((day) => schemaDays[day]),
    opens,
    closes,
  }));
}
