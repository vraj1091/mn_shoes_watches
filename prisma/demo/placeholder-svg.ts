/*
 * Placeholder product images for categories without demo photos: a simple line drawing of the
 * product type and the product name on a transparent background, so the photo tile of either
 * theme shows through. Never a stock or AI-made photo; the
 * admin flags these products until a real photo is uploaded.
 */
import { hex } from "../../lib/design/tokens";
import type { PlaceholderIcon } from "./products";

// Line drawings on a 200 × 200 grid, stroked, no fill.
const ICONS: Record<PlaceholderIcon, string> = {
  oxford:
    '<path d="M18 128c0-16 10-24 32-27l40-6c14-14 30-24 52-20 26 5 40 22 42 46v7H18z"/><path d="M14 146h174"/><path d="M84 96l10 14M98 92l10 14M112 88l9 13"/><path d="M150 140v-12"/>',
  boot:
    '<path d="M62 30h50v72c34 2 60 12 70 28 4 7 2 14-6 14H58c-6 0-9-4-8-10l12-82z"/><path d="M50 156h138"/><path d="M62 70h50"/><path d="M112 102l-14 30"/>',
  mojari:
    '<path d="M16 132c4-18 22-26 48-28 34-4 64 2 88 10 18 6 30 2 38-12 4 18-4 34-22 38H34c-12 0-20-3-18-8z"/><path d="M14 148h170"/><circle cx="74" cy="118" r="3"/><circle cx="92" cy="114" r="3"/><circle cx="110" cy="116" r="3"/><circle cx="128" cy="120" r="3"/>',
  sandal:
    '<path d="M72 24c-26 2-36 30-34 66 2 44 12 76 36 84 24 7 44-6 52-30 10-30 6-74-8-100-10-16-26-22-46-20z"/><path d="M42 70c26-10 64-10 90-2M40 104c30-8 64-8 92 0"/><path d="M84 30v18"/>',
  slide:
    '<path d="M74 22c-26 2-38 30-36 68 2 44 14 74 38 82 24 7 44-6 52-30 10-30 6-74-8-100-10-16-26-22-46-20z"/><rect x="36" y="58" width="104" height="44" rx="12"/>',
  perfume:
    '<rect x="52" y="78" width="96" height="104" rx="12"/><rect x="84" y="60" width="32" height="18"/><rect x="76" y="30" width="48" height="30" rx="4"/><rect x="72" y="112" width="56" height="34" rx="2"/>',
  attar:
    '<path d="M100 92c-30 0-50 18-50 44s22 44 50 44 50-18 50-44-20-44-50-44z"/><rect x="88" y="70" width="24" height="22"/><path d="M100 20v50"/><circle cx="100" cy="18" r="8"/>',
  belt:
    '<rect x="30" y="74" width="46" height="52" rx="4"/><path d="M53 74v52"/><path d="M76 86h96a14 14 0 0 1 0 28H76"/><circle cx="120" cy="100" r="3"/><circle cx="138" cy="100" r="3"/><circle cx="156" cy="100" r="3"/>',
  wallet:
    '<rect x="30" y="52" width="140" height="100" rx="10"/><path d="M100 52v100"/><path d="M42 72h44M42 88h44M42 104h44"/><path d="M114 124h44"/>',
  "card-holder":
    '<rect x="42" y="56" width="116" height="88" rx="8"/><path d="M42 82h116M42 104h116M42 126h116"/><path d="M60 70h40"/>',
  polish:
    '<ellipse cx="72" cy="130" rx="40" ry="14"/><path d="M32 130v16c0 8 18 14 40 14s40-6 40-14v-16"/><rect x="118" y="52" width="58" height="26" rx="6"/><path d="M124 78v20M136 78v20M148 78v20M160 78v20M170 78v20"/>',
  "shoe-tree":
    '<path d="M24 120c0-18 14-30 40-32l58-4c22-2 46 6 56 20 6 9 4 20-8 22l-54 6"/><path d="M116 132H52c-18 0-28-6-28-12"/><path d="M116 132c10 0 18-6 18-16"/><path d="M134 116h30"/><rect x="164" y="104" width="14" height="24" rx="4"/>',
  strap:
    '<rect x="78" y="20" width="44" height="64" rx="8"/><rect x="78" y="116" width="44" height="64" rx="8"/><circle cx="100" cy="100" r="22"/><path d="M100 140v4M100 154v4M100 168v4"/><path d="M88 34h24"/>',
};

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Splits a name into at most three lines of about `width` characters. */
function wrap(text: string, width = 20): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function placeholderSvg(icon: PlaceholderIcon, name: string): string {
  const ink = hex("espresso-500");
  const lines = wrap(name);
  const text = lines
    .map((line, i) => `<text x="500" y="${720 + i * 78}" text-anchor="middle">${escapeXml(line)}</text>`)
    .join("");
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">',
    `<g transform="translate(300 110) scale(2)" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g>`,
    `<g font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="64" font-weight="600" fill="${ink}">${text}</g>`,
    "</svg>",
    "",
  ].join("\n");
}
