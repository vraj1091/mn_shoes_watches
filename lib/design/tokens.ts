/*
 * The one place colours are defined (DECISIONS.md 44 and 72). "Bone, Espresso, Oxblood": the
 * materials the shop sells — bone paper and shoe boxes, espresso leather, oxblood shoe polish —
 * used 60-30-10: bone backgrounds, espresso text and frame (header, footer, admin sidebar), and
 * oxblood for the one main button per view, sale prices, badges and active states. Three status
 * colours mean success, warning and error, always next to an icon and words.
 *
 * `npm run tokens` turns this file into app/theme.css (CSS variables and Tailwind theme tokens)
 * and app/icon.svg; a unit test fails if either is out of date. Emails, the proxy's 404 page,
 * product placeholders and the 2FA QR code import the values from here, and
 * `npm run check:contrast` checks every pair in both themes.
 */

export const palette = {
  // Bone paper, shoe boxes and linen: the light theme's backgrounds (the 60 %).
  bone: {
    50: "#FBF9F5", // Paper: cards
    100: "#F5F1EA", // Bone: page; text on espresso and oxblood
    200: "#EDE7DD", // Linen: section bands, photo tiles
    300: "#E4DDD1", // borders
  },
  // Espresso leather: text and frame in light (the 30 %), and the whole warm dark theme.
  espresso: {
    100: "#EDE6DB", // text, dark
    300: "#A89E92", // secondary text, dark and on espresso
    500: "#6B6158", // Walnut: secondary text
    700: "#352D28", // borders, dark
    750: "#2A2420", // section bands, dark
    800: "#2A2320", // Espresso: text, header and footer
    850: "#201B18", // cards and photo tiles, dark
    900: "#161210", // page, dark (never pure black)
  },
  // Oxblood shoe polish: the accent (the 10 %).
  oxblood: {
    300: "#D2676D", // text and prices, dark
    500: "#A3363E", // button hover, dark
    600: "#8E2C33", // button fill, dark
    700: "#7A1F2B", // Oxblood: button, prices, badges
    800: "#631822", // button hover
  },
  // Status, small use only. 700 is the brief's value; 300 is the same hue lightened for the dark
  // theme, where the 700s fall below AA (DECISIONS.md 72).
  green: { 300: "#74B592", 700: "#2F6B4F" },
  amber: { 300: "#D9A84F", 700: "#9A6A12" },
  scarlet: { 300: "#F08F7C", 700: "#B42318" },
} as const;

type Family = keyof typeof palette;
type Shade<F extends Family> = `${F}-${keyof (typeof palette)[F] & (string | number)}`;
export type ColourRef = { [F in Family]: Shade<F> }[Family];
type Pair = { light: ColourRef; dark: ColourRef };

/** Hex value of a palette reference such as "oxblood-700". */
export function hex(ref: ColourRef): string {
  const [family, shade] = ref.split("-") as [Family, string];
  return (palette[family] as Record<string, string>)[shade]!;
}

/**
 * Semantic tokens, each a palette reference for light and for dark mode. Components only ever use
 * these (bg-canvas, text-ink, bg-primary …), so the two modes switch in one place. The brief's
 * "surface/card" is `raised` and its "surface-alt" is `surface`.
 */
export const semantic = {
  canvas: { light: "bone-100", dark: "espresso-900", note: "page background (60 %)" },
  surface: { light: "bone-200", dark: "espresso-750", note: "Linen: section bands, filter panel, hover fills" },
  raised: { light: "bone-50", dark: "espresso-850", note: "Paper: cards, drawers, menus, modals" },
  line: { light: "bone-300", dark: "espresso-700", note: "hairline borders and dividers" },
  "line-strong": { light: "espresso-500", dark: "espresso-300", note: "form-field borders (3:1 against the page)" },
  ink: { light: "espresso-800", dark: "espresso-100", note: "text and headings (30 %)" },
  muted: { light: "espresso-500", dark: "espresso-300", note: "secondary text" },
  link: { light: "espresso-800", dark: "espresso-100", note: "links (underlined, oxblood on hover) and focus rings" },
  primary: { light: "oxblood-700", dark: "oxblood-600", note: "the one filled button per view (10 %)" },
  "primary-hover": { light: "oxblood-800", dark: "oxblood-500", note: "primary button hover" },
  "on-primary": { light: "bone-100", dark: "bone-100", note: "text on primary" },
  accent: { light: "oxblood-700", dark: "oxblood-300", note: "sale prices, active states, link hover; on the page or a card, not on a band" },
  star: { light: "espresso-800", dark: "espresso-100", note: "rating stars" },
  badge: { light: "bone-50", dark: "espresso-900", note: "badge background on a photo: New, Bestseller, −20 %" },
  "badge-ink": { light: "oxblood-700", dark: "oxblood-300", note: "badge text" },
  tile: { light: "bone-200", dark: "espresso-850", note: "product photo tile; demo photos are cut-outs" },
  "tile-ink": { light: "espresso-500", dark: "espresso-300", note: "text and icons on the photo tile" },
  success: { light: "green-700", dark: "green-300", note: "in stock, saved, delivered — with an icon" },
  warning: { light: "amber-700", dark: "amber-300", note: "low stock, demo data — icons only; the words stay ink" },
  error: { light: "scarlet-700", dark: "scarlet-300", note: "errors, sold out, delete — with an icon" },
  "on-error": { light: "bone-100", dark: "espresso-900", note: "text on a delete button" },
  announce: { light: "bone-200", dark: "espresso-750", note: "announcement bar (a Linen strip)" },
  "on-announce": { light: "espresso-800", dark: "espresso-100", note: "announcement text" },
  selection: { light: "bone-300", dark: "espresso-700", note: "selected text background" },
} as const satisfies Record<string, Pair & { note: string }>;

export type SemanticToken = keyof typeof semantic;
export type Mode = "light" | "dark";

/**
 * The espresso frame: the store header and footer and the admin sidebar carry the class `chrome`,
 * which redefines these tokens inside them, so the same classes (text-ink, hover:bg-surface …)
 * read as bone on espresso. Menus, drawers and popovers that open from the frame carry
 * `chrome-exit` and get the page's tokens back. In dark mode the frame is the card colour.
 */
export const chrome = {
  canvas: { light: "espresso-800", dark: "espresso-850" },
  raised: { light: "espresso-800", dark: "espresso-850" },
  surface: { light: "espresso-700", dark: "espresso-750" },
  line: { light: "espresso-700", dark: "espresso-700" },
  "line-strong": { light: "espresso-300", dark: "espresso-300" },
  ink: { light: "bone-100", dark: "espresso-100" },
  muted: { light: "espresso-300", dark: "espresso-300" },
  link: { light: "bone-100", dark: "espresso-100" },
  // Oxblood text cannot reach 4.5:1 on espresso, so in the frame it marks things (an underline,
  // a dot) and the words stay bone.
  accent: { light: "oxblood-300", dark: "oxblood-300" },
  primary: { light: "oxblood-600", dark: "oxblood-600" },
  "primary-hover": { light: "oxblood-500", dark: "oxblood-500" },
  success: { light: "green-300", dark: "green-300" },
  selection: { light: "espresso-700", dark: "espresso-700" },
} as const satisfies Partial<Record<SemanticToken, Pair>>;

export type Scheme = "page" | "chrome";

/** Resolved hex values for one mode, for places that cannot use CSS variables (emails, QR codes). */
export function resolve(mode: Mode, scheme: Scheme = "page"): Record<SemanticToken, string> {
  const values = Object.fromEntries(Object.entries(semantic).map(([name, value]) => [name, hex(value[mode])])) as Record<SemanticToken, string>;
  if (scheme === "chrome") for (const [name, value] of Object.entries(chrome)) values[name as SemanticToken] = hex(value[mode]);
  return values;
}

/** Overlay colours, mixed from the palette rather than written as new colours. */
const overlays = {
  light: { scrim: "color-mix(in srgb, var(--color-espresso-900) 50%, transparent)", shadow: 24 },
  dark: { scrim: "color-mix(in srgb, var(--color-espresso-900) 72%, transparent)", shadow: 60 },
} as const;

// ─── Contrast requirements (WCAG 2.2 AA) ────────────────────────────────────

export type ContrastPair = { fg: SemanticToken; bg: SemanticToken; min: number; use: string };

const TEXT = 4.5;
const GRAPHIC = 3; // icons, stars, underlines, form-field borders (WCAG 1.4.11)
const PAGE = ["canvas", "surface", "raised"] as const;

export const contrastPairs: ContrastPair[] = [
  ...(["ink", "muted", "link", "success", "error"] as const).flatMap((fg) => PAGE.map((bg) => ({ fg, bg, min: TEXT, use: "text" }))),
  // Oxblood text (sale prices) sits on the page or a card. On a dark Linen band it would be 4.3:1.
  ...(["canvas", "raised"] as const).map((bg) => ({ fg: "accent" as const, bg, min: TEXT, use: "sale price, active state" })),
  { fg: "accent", bg: "tile", min: GRAPHIC, use: "wishlist heart on a photo" },
  ...PAGE.map((bg) => ({ fg: "warning" as const, bg, min: GRAPHIC, use: "warning icon" })),
  ...PAGE.map((bg) => ({ fg: "star" as const, bg, min: GRAPHIC, use: "rating stars" })),
  ...PAGE.map((bg) => ({ fg: "line-strong" as const, bg, min: GRAPHIC, use: "form-field border" })),
  { fg: "on-primary", bg: "primary", min: TEXT, use: "button text" },
  { fg: "on-primary", bg: "primary-hover", min: TEXT, use: "button text, hover" },
  { fg: "on-error", bg: "error", min: TEXT, use: "delete button text" },
  { fg: "canvas", bg: "ink", min: TEXT, use: "espresso fill (WhatsApp button)" },
  { fg: "badge-ink", bg: "badge", min: TEXT, use: "badge text" },
  { fg: "tile-ink", bg: "tile", min: TEXT, use: "text on a photo tile" },
  { fg: "on-announce", bg: "announce", min: TEXT, use: "announcement bar" },
  { fg: "ink", bg: "selection", min: TEXT, use: "selected text" },
];

/** Inside the espresso frame: header, footer, admin sidebar. */
export const chromePairs: ContrastPair[] = [
  ...(["ink", "muted", "link"] as const).flatMap((fg) => (["canvas", "surface"] as const).map((bg) => ({ fg, bg, min: TEXT, use: "text in the frame" }))),
  { fg: "accent", bg: "canvas", min: GRAPHIC, use: "Sale underline, active marker" },
  { fg: "success", bg: "canvas", min: GRAPHIC, use: "signed-in dot" },
  { fg: "line-strong", bg: "canvas", min: GRAPHIC, use: "search field border" },
  { fg: "on-primary", bg: "primary", min: TEXT, use: "bag count" },
  { fg: "ink", bg: "selection", min: TEXT, use: "selected text" },
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
  const schemes = [
    { scheme: "page", pairs: contrastPairs },
    { scheme: "chrome", pairs: chromePairs },
  ] as const;
  return schemes.flatMap(({ scheme, pairs }) =>
    (["light", "dark"] as const).flatMap((mode) => {
      const values = resolve(mode, scheme);
      return pairs.map((pair) => {
        const ratio = contrastRatio(values[pair.fg], values[pair.bg]);
        return { mode: scheme === "page" ? mode : `${mode}, frame`, ...pair, ratio, pass: ratio >= pair.min };
      });
    }),
  );
}

// ─── Generated files ────────────────────────────────────────────────────────

const HEADER = "/* Generated by `npm run tokens` from lib/design/tokens.ts. Do not edit by hand. */";

/** app/theme.css: palette as Tailwind theme colours, semantic tokens for light and dark, the frame. */
export function themeCss(): string {
  const paletteLines = Object.entries(palette).flatMap(([family, shades]) =>
    Object.entries(shades).map(([shade, value]) => `  --color-${family}-${shade}: ${value};`),
  );
  const mapping = Object.keys(semantic).map((name) => `  --color-${name}: var(--${name});`);
  const tokens = (entries: [string, Pair][], mode: Mode) => entries.map(([name, value]) => `  --${name}: var(--color-${value[mode]});`);
  const modeBlock = (mode: Mode) => [
    `  color-scheme: ${mode};`,
    ...tokens(Object.entries(semantic), mode),
    `  --scrim: ${overlays[mode].scrim};`,
    `  --shadow-tint: color-mix(in srgb, var(--color-espresso-900) ${overlays[mode].shadow}%, transparent);`,
  ];
  const chromeEntries = Object.entries(chrome) as [string, Pair][];
  const baseForChrome = chromeEntries.map(([name]) => [name, semantic[name as SemanticToken]] as [string, Pair]);
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
    "/* The espresso frame (header, footer, admin sidebar) and what opens from it (.chrome-exit). */",
    ".chrome {",
    "  color-scheme: dark;",
    ...tokens(chromeEntries, "light"),
    "  color: var(--ink);",
    "}",
    "",
    ":root.dark .chrome {",
    ...tokens(chromeEntries, "dark"),
    "}",
    "",
    ".chrome .chrome-exit {",
    "  color-scheme: light;",
    ...tokens(baseForChrome, "light"),
    "  color: var(--ink);",
    "}",
    "",
    ":root.dark .chrome .chrome-exit {",
    "  color-scheme: dark;",
    ...tokens(baseForChrome, "dark"),
    "}",
    "",
  ].join("\n");
}

/** app/icon.svg: the browser-tab icon, bone letters on espresso with an oxblood rule. */
export function iconSvg(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    `  <rect width="64" height="64" rx="6" fill="${hex("espresso-800")}"/>`,
    `  <text x="32" y="41" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-weight="500" letter-spacing="0.5" fill="${hex("bone-100")}">MN</text>`,
    `  <path d="M18 50h28" stroke="${hex("oxblood-300")}" stroke-width="2.5" stroke-linecap="round"/>`,
    "</svg>",
    "",
  ].join("\n");
}

/** The default link preview (1200 × 630) for pages without a photo of their own; npm run tokens renders it to public/og.png. */
export function ogImageSvg(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">',
    `  <rect width="1200" height="630" fill="${hex("espresso-800")}"/>`,
    `  <text x="96" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="500" fill="${hex("bone-100")}">MN Shoes &amp; Watches</text>`,
    `  <path d="M98 350h160" stroke="${hex("oxblood-300")}" stroke-width="4" stroke-linecap="round"/>`,
    `  <text x="96" y="430" font-family="'Segoe UI', Arial, sans-serif" font-size="38" fill="${hex("espresso-300")}">Shoes, watches and perfumes</text>`,
    `  <text x="96" y="486" font-family="'Segoe UI', Arial, sans-serif" font-size="38" fill="${hex("espresso-300")}">Kalol, Gujarat</text>`,
    "</svg>",
    "",
  ].join("\n");
}
