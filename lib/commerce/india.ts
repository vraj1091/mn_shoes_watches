/*
 * Indian states and union territories with their GST state codes, and what a PIN code tells us
 * about where it is. The first digits of a PIN code identify the postal circle, which is close to
 * the state; the address form still asks for the state, and that is what GST uses.
 */

export const STATES: { code: string; name: string }[] = [
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "18", name: "Assam" },
  { code: "10", name: "Bihar" },
  { code: "04", name: "Chandigarh" },
  { code: "22", name: "Chhattisgarh" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "07", name: "Delhi" },
  { code: "30", name: "Goa" },
  { code: "24", name: "Gujarat" },
  { code: "06", name: "Haryana" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "01", name: "Jammu and Kashmir" },
  { code: "20", name: "Jharkhand" },
  { code: "29", name: "Karnataka" },
  { code: "32", name: "Kerala" },
  { code: "38", name: "Ladakh" },
  { code: "31", name: "Lakshadweep" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "27", name: "Maharashtra" },
  { code: "14", name: "Manipur" },
  { code: "17", name: "Meghalaya" },
  { code: "15", name: "Mizoram" },
  { code: "13", name: "Nagaland" },
  { code: "21", name: "Odisha" },
  { code: "34", name: "Puducherry" },
  { code: "03", name: "Punjab" },
  { code: "08", name: "Rajasthan" },
  { code: "11", name: "Sikkim" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "16", name: "Tripura" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "05", name: "Uttarakhand" },
  { code: "19", name: "West Bengal" },
];

export const stateName = (code: string) => STATES.find((state) => state.code === code)?.name ?? null;

/** Six digits, not starting with 0 or 9 (9 is the Army Postal Service). */
export const isValidPin = (pin: string) => /^[1-8]\d{5}$/.test(pin);

// Postal circles by PIN prefix (three-digit entries win over two-digit ones).
const PREFIX_STATE: Record<string, string> = {
  "11": "07",
  "12": "06", "13": "06",
  "14": "03", "15": "03", "160": "04", "16": "03",
  "17": "02",
  "18": "01", "19": "01", "194": "38",
  "20": "09", "21": "09", "22": "09", "23": "09", "24": "09", "25": "09", "26": "09", "27": "09", "28": "09",
  "246": "05", "247": "05", "248": "05", "249": "05", "262": "05", "263": "05",
  "30": "08", "31": "08", "32": "08", "33": "08", "34": "08",
  "36": "24", "37": "24", "38": "24", "39": "24", "396": "26",
  "40": "27", "41": "27", "42": "27", "43": "27", "44": "27", "403": "30",
  "45": "23", "46": "23", "47": "23", "48": "23", "49": "22",
  "50": "36", "51": "37", "52": "37", "53": "37",
  "56": "29", "57": "29", "58": "29", "59": "29",
  "60": "33", "61": "33", "62": "33", "63": "33", "64": "33", "605": "34",
  "67": "32", "68": "32", "69": "32", "682": "32",
  "70": "19", "71": "19", "72": "19", "73": "19", "74": "19", "737": "11", "744": "35",
  "75": "21", "76": "21", "77": "21",
  "78": "18",
  "790": "12", "791": "12", "792": "12", "793": "17", "794": "17", "795": "14", "796": "15", "797": "13", "798": "13", "799": "16",
  "80": "10", "84": "10", "85": "10", "81": "20", "82": "20", "83": "20",
};

/** Best guess at the state from a PIN code, or null when the prefix is unknown. */
export function stateCodeForPin(pin: string): string | null {
  if (!isValidPin(pin)) return null;
  return PREFIX_STATE[pin.slice(0, 3)] ?? PREFIX_STATE[pin.slice(0, 2)] ?? null;
}

/** Places couriers take longer to reach (shipping policy: 5–8 days). */
export const REMOTE_STATE_CODES = new Set(["01", "38", "35", "31", "12", "13", "14", "15", "16", "17", "18", "11"]);
