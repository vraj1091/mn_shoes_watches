/*
 * The one place colours are defined (DECISIONS.md 44). Three families — Graphite (neutrals),
 * Oxford Navy (brand) and Brass (accent) — plus two status colours used only for meaning.
 *
 * `npm run tokens` turns this file into app/theme.css (CSS variables and Tailwind theme tokens)
 * and app/icon.svg; a unit test fails if either is out of date. Emails, the proxy's 404 page and
 * the 2FA QR code import the values from here, and `npm run check:contrast` checks every pair.
 */

export const palette = {
  graphite: {
    0: "#FFFFFF",
    50: "#F4F5F7",
    75: "#F2F3F5", // photo tile, light
    100: "#ECEEF1",
    150: "#E8EBEF", // body text, dark
    200: "#E3E6EA",
    250: "#DFE3E8", // photo tile, dark
    300: "#C9CED6",
    400: "#9AA3AE", // secondary text, dark
    500: "#8A929C",
    600: "#5D6570",
    800: "#2A313B",
    875: "#1C222A", // raised surfaces, dark
    900: "#1D2229",
    925: "#161B22", // surface bands, dark
    950: "#0F1318",
  },
  navy: {
    50: "#EEF3FA",
    100: "#DCE6F4",
    150: "#C7D7EE", // primary hover, dark
    300: "#8DB3E6",
    500: "#2F5E9C",
    600: "#1F4A80",
    700: "#1B3A63",
    800: "#142C4C",
    900: "#10233D",
  },
  brass: {
    100: "#F6ECD9",
    200: "#E9C47E", // badge text, dark
    300: "#E3B868",
    400: "#D9A752", // accent, dark
    500: "#C8922F",
    600: "#B07D2A",
    800: "#6E4C14",
    900: "#3A2E17",
  },
  // Status colours: sale prices, errors, "only N left" (red) and "in stock" (green). Nothing else.
  red: { 300: "#F2776B", 600: "#C4372B" },
  green: { 300: "#5CC28A", 700: "#1E7A49" },
} as const;

type Family = keyof typeof palette;
type Shade<F extends Family> = `${F}-${keyof (typeof palette)[F] & (string | number)}`;
export type ColourRef = { [F in Family]: Shade<F> }[Family];

/** Hex value of a palette reference such as "navy-700". */
export function hex(ref: ColourRef): string {
  const [family, shade] = ref.split("-") as [Family, string];
  return (palette[family] as Record<string, string>)[shade]!;
}

/**
 * Semantic tokens, each a palette reference for light and for dark mode. Components only ever use
 * these (bg-canvas, text-ink, bg-primary …), so the two modes switch in one place.
 */
export const semantic = {
  canvas: { light: "graphite-0", dark: "graphite-950", note: "page background (bg)" },
  surface: { light: "graphite-50", dark: "graphite-925", note: "filter panel, footer, section bands" },
  raised: { light: "graphite-0", dark: "graphite-875", note: "cards, drawers, mega menu, modals" },
  line: { light: "graphite-200", dark: "graphite-800", note: "borders and dividers" },
  "line-strong": { light: "graphite-600", dark: "graphite-500", note: "form-field borders (3:1 against the page)" },
  ink: { light: "graphite-900", dark: "graphite-150", note: "body text" },
  muted: { light: "graphite-600", dark: "graphite-400", note: "secondary text" },
  primary: { light: "navy-700", dark: "navy-100", note: "Add to bag, Buy now, Place order" },
  "primary-hover": { light: "navy-800", dark: "navy-150", note: "primary button hover" },
  "on-primary": { light: "graphite-0", dark: "navy-900", note: "text on primary" },
  link: { light: "navy-600", dark: "navy-300", note: "links and focus rings" },
  accent: { light: "brass-500", dark: "brass-400", note: "small highlights only, never a large background" },
  star: { light: "brass-600", dark: "brass-400", note: "rating stars (3:1 graphic contrast)" },
  badge: { light: "brass-100", dark: "brass-900", note: "badge background: New, Bestseller" },
  "badge-ink": { light: "brass-800", dark: "brass-200", note: "badge text" },
  tile: { light: "graphite-75", dark: "graphite-250", note: "product photo tile; photos are shot on white" },
  "tile-ink": { light: "graphite-600", dark: "graphite-600", note: "text on the photo tile, which stays light" },
  sale: { light: "red-600", dark: "red-300", note: "sale price, errors, low stock" },
  stock: { light: "green-700", dark: "green-300", note: "in stock, success" },
  announce: { light: "navy-700", dark: "navy-800", note: "announcement bar" },
  "on-announce": { light: "graphite-0", dark: "graphite-0", note: "announcement text" },
  selection: { light: "navy-100", dark: "navy-800", note: "selected text background" },
} as const satisfies Record<string, { light: ColourRef; dark: ColourRef; note: string }>;

export type SemanticToken = keyof typeof semantic;
export type Mode = "light" | "dark";

/** Resolved hex values for one mode, for places that cannot use CSS variables (emails, QR codes). */
export function resolve(mode: Mode): Record<SemanticToken, string> {
  return Object.fromEntries(Object.entries(semantic).map(([name, value]) => [name, hex(value[mode])])) as Record<
    SemanticToken,
    string
  >;
}

/** Overlay colours, mixed from the palette rather than written as new colours. */
const overlays = {
  light: { scrim: "color-mix(in srgb, var(--color-graphite-950) 50%, transparent)", shadow: 30 },
  dark: { scrim: "color-mix(in srgb, var(--color-graphite-950) 72%, transparent)", shadow: 60 },
} as const;

// ─── Contrast requirements (WCAG 2.2 AA) ────────────────────────────────────

export type ContrastPair = { fg: SemanticToken; bg: SemanticToken; min: number; use: string };

const TEXT = 4.5;
const GRAPHIC = 3; // icons, stars, form-field borders (WCAG 1.4.11)

export const contrastPairs: ContrastPair[] = [
  ...(["ink", "muted", "link", "sale", "stock"] as const).flatMap((fg) =>
    (["canvas", "surface", "raised"] as const).map((bg) => ({ fg, bg, min: TEXT, use: "text" })),
  ),
  { fg: "on-primary", bg: "primary", min: TEXT, use: "button text" },
  { fg: "on-primary", bg: "primary-hover", min: TEXT, use: "button text, hover" },
  { fg: "badge-ink", bg: "badge", min: TEXT, use: "badge text" },
  { fg: "tile-ink", bg: "tile", min: TEXT, use: "text on a photo tile" },
  { fg: "on-announce", bg: "announce", min: TEXT, use: "announcement bar" },
  { fg: "ink", bg: "selection", min: TEXT, use: "selected text" },
  { fg: "canvas", bg: "sale", min: TEXT, use: "danger button text" },
  // Stars sit under the photo, never on the tile.
  ...(["canvas", "surface", "raised"] as const).map((bg) => ({ fg: "star" as const, bg, min: GRAPHIC, use: "rating stars" })),
  ...(["canvas", "surface", "raised"] as const).map((bg) => ({ fg: "line-strong" as const, bg, min: GRAPHIC, use: "form-field border" })),
  { fg: "primary", bg: "canvas", min: GRAPHIC, use: "button edge" },
];

function luminance(value: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export function checkContrast() {
  return (["light", "dark"] as const).flatMap((mode) => {
    const values = resolve(mode);
    return contrastPairs.map((pair) => {
      const ratio = contrastRatio(values[pair.fg], values[pair.bg]);
      return { mode, ...pair, ratio, pass: ratio >= pair.min };
    });
  });
}

// ─── Generated files ────────────────────────────────────────────────────────

const HEADER = "/* Generated by `npm run tokens` from lib/design/tokens.ts. Do not edit by hand. */";

/** app/theme.css: palette as Tailwind theme colours, semantic tokens for light and dark. */
export function themeCss(): string {
  const paletteLines = Object.entries(palette).flatMap(([family, shades]) =>
    Object.entries(shades).map(([shade, value]) => `  --color-${family}-${shade}: ${value};`),
  );
  const mapping = Object.keys(semantic).map((name) => `  --color-${name}: var(--${name});`);
  const modeBlock = (mode: Mode) => [
    `  color-scheme: ${mode};`,
    ...Object.entries(semantic).map(([name, value]) => `  --${name}: var(--color-${value[mode]});`),
    `  --scrim: ${overlays[mode].scrim};`,
    `  --shadow-tint: color-mix(in srgb, var(--color-graphite-950) ${overlays[mode].shadow}%, transparent);`,
  ];
  return [
    HEADER,
    "",
    "@theme {",
    "  --color-*: initial;",
    "  --color-transparent: transparent;",
    "  --color-current: currentColor;",
    ...paletteLines,
    "}",
    "",
    "/* Semantic utilities: bg-canvas, text-ink, border-line, bg-primary … */",
    "@theme inline {",
    ...mapping,
    "  --color-scrim: var(--scrim);",
    "}",
    "",
    ":root {",
    ...modeBlock("light"),
    "}",
    "",
    "/* next-themes puts .dark on <html> for a dark choice, or for the system setting when it is dark. */",
    ":root.dark {",
    ...modeBlock("dark"),
    "}",
    "",
  ].join("\n");
}

/** app/icon.svg: the browser-tab icon, navy with a brass rule. */
export function iconSvg(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    `  <rect width="64" height="64" rx="8" fill="${hex("navy-700")}"/>`,
    `  <text x="32" y="42" text-anchor="middle" font-family="'Hanken Grotesk', 'Segoe UI', Arial, sans-serif" font-size="27" font-weight="700" letter-spacing="-1" fill="${hex("graphite-0")}">MN</text>`,
    `  <path d="M17 50h30" stroke="${hex("brass-300")}" stroke-width="2.5" stroke-linecap="round"/>`,
    "</svg>",
    "",
  ].join("\n");
}
