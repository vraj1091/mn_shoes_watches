/** Times are stored in UTC and always shown in India Standard Time, whatever the server's zone. */

export const IST = "Asia/Kolkata";

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const shortDayFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** 25 Oct 2026 */
export const formatDate = (date: Date) => dateFormat.format(date);

/** 25 Oct 2026, 3:05 pm */
export const formatDateTime = (date: Date) => dateTimeFormat.format(date);

/** Sat, 31 Oct — used for delivery estimates */
export const formatDeliveryDay = (date: Date) => shortDayFormat.format(date);

/** The calendar date in IST as YYYY-MM-DD, e.g. for comparing against the holiday list. */
export function istDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}

/** The hour of day (0–23) in IST. */
export function istHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", hourCycle: "h23" }).format(date),
  );
}
