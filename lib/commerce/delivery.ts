import { isValidPin, REMOTE_STATE_CODES, stateCodeForPin } from "./india";

/*
 * Delivery estimate from a PIN code: which shipping zone it falls in, when the order leaves the
 * shop, and the earliest and latest delivery days. Pure, so the product page, cart and checkout
 * agree, and it can be tested.
 */

export type ZoneRule = {
  name: string;
  stateCodes: string[]; // empty = everywhere else
  pinPrefixes: string[] | null;
  minDays: number;
  maxDays: number;
  price: number;
  codAvailable: boolean;
};

export type DispatchRules = {
  cutoffHour: number; // IST, 0–23
  holidays: string[]; // YYYY-MM-DD in IST
};

export type DeliveryEstimate = {
  zone: string;
  stateCode: string | null;
  dispatchDate: Date;
  minDate: Date;
  maxDate: Date;
  shippingPrice: number;
  codAvailable: boolean;
};

const REMOTE_EXTRA_DAYS = 2;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The IST calendar day of a moment, as a UTC-midnight Date (so day arithmetic ignores time zones). */
function istDay(moment: Date): Date {
  const ist = new Date(moment.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

const key = (day: Date) => day.toISOString().slice(0, 10);
const addDays = (day: Date, days: number) => new Date(day.getTime() + days * 24 * 60 * 60 * 1000);
const isSunday = (day: Date) => day.getUTCDay() === 0;

/** The zone for a PIN: a PIN-prefix zone first, then a state zone, then the catch-all. */
export function zoneFor(pin: string, zones: ZoneRule[]): ZoneRule | null {
  const state = stateCodeForPin(pin);
  return (
    zones.find((zone) => zone.pinPrefixes?.some((prefix) => pin.startsWith(prefix))) ??
    zones.find((zone) => !zone.pinPrefixes?.length && state !== null && zone.stateCodes.includes(state)) ??
    zones.find((zone) => !zone.pinPrefixes?.length && zone.stateCodes.length === 0) ??
    null
  );
}

/**
 * Orders before the cut-off on a working day leave the same day; others the next working day.
 * Couriers do not deliver on Sundays, so transit days skip them.
 */
export function estimateDelivery(pin: string, now: Date, zones: ZoneRule[], rules: DispatchRules): DeliveryEstimate | null {
  if (!isValidPin(pin)) return null;
  const zone = zoneFor(pin, zones);
  if (!zone) return null;
  const stateCode = stateCodeForPin(pin);
  const holidays = new Set(rules.holidays);
  const isWorkingDay = (day: Date) => !isSunday(day) && !holidays.has(key(day));

  const istHour = new Date(now.getTime() + IST_OFFSET_MS).getUTCHours();
  let dispatch = istDay(now);
  if (istHour >= rules.cutoffHour || !isWorkingDay(dispatch)) {
    do dispatch = addDays(dispatch, 1);
    while (!isWorkingDay(dispatch));
  }

  const remote = stateCode !== null && REMOTE_STATE_CODES.has(stateCode);
  const afterTransit = (days: number) => {
    let day = dispatch;
    for (let left = days; left > 0; ) {
      day = addDays(day, 1);
      if (!isSunday(day)) left -= 1;
    }
    return day;
  };
  return {
    zone: zone.name,
    stateCode,
    dispatchDate: dispatch,
    minDate: afterTransit(zone.minDays + (remote ? REMOTE_EXTRA_DAYS : 0)),
    maxDate: afterTransit(zone.maxDays + (remote ? REMOTE_EXTRA_DAYS : 0)),
    shippingPrice: zone.price,
    codAvailable: zone.codAvailable,
  };
}
