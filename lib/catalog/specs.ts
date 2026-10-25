/** Plain-language explanations of technical specs (Part 4: "30 m = splash-proof, not for swimming"). */

export function describeWaterResistance(metres: number): string {
  if (metres <= 0) return "Not water-resistant: keep it dry.";
  if (metres < 50) return `${metres} m: splash-proof. Fine for hand washing and rain, not for swimming or showering.`;
  if (metres < 100) return `${metres} m: brief swimming in a pool. Not for diving or hot showers.`;
  if (metres < 200) return `${metres} m: swimming and snorkelling. Not for diving.`;
  return `${metres} m: suitable for recreational diving.`;
}

/** Number values without trailing zeros, with the unit: 42 → "42 mm", 2.5 → "2.5 cm". */
export function formatNumberSpec(value: number, unit: string | null): string {
  const text = String(Number(value.toFixed(2)));
  return unit ? `${text} ${unit}` : text;
}

/** Width of a 16–17 cm wrist seen from above, used to draw dial sizes to scale. */
export const WRIST_WIDTH_MM = 55;
