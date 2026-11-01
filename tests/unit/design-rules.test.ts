import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* The look rules of DECISIONS.md 74, checked over every page, component and stylesheet. */

function sources(): { file: string; text: string }[] {
  const found: { file: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.(tsx?|css)$/.test(name)) found.push({ file, text: readFileSync(file, "utf8") });
    }
  };
  ["app", "components"].forEach(walk);
  return found;
}

function offenders(pattern: RegExp, allow: (match: string) => boolean = () => false) {
  return sources().flatMap(({ file, text }) => [...text.matchAll(new RegExp(pattern, "g"))].filter((match) => !allow(match[0])).map((match) => `${file}: ${match[0]}`));
}

describe("design rules", () => {
  it("has no gradients, glass, blur or glow", () => {
    expect(offenders(/\bbg-(?:gradient|linear|radial|conic)-|\b(?:linear|radial|conic)-gradient\(|\bbackdrop-(?:blur|filter|saturate)|\bblur-(?:xs|sm|md|lg|xl|2xl|3xl|none|\[)|filter:\s*blur|\bdrop-shadow|\btext-shadow/)).toEqual([]);
  });

  it("uses only the one overlay shadow", () => {
    expect(offenders(/\bshadow-(?:xs|sm|md|lg|xl|2xl|inner|card)\b/)).toEqual([]);
  });

  it("keeps corners small: no rounded-xl or larger", () => {
    expect(offenders(/\brounded(?:-[trblse]{1,2})?-(?:xl|2xl|3xl|4xl)\b/)).toEqual([]);
  });

  it("defines radii between 2 and 6 px", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const radii = [...css.matchAll(/--radius-(sm|md|lg):\s*(\d+)px/g)].map((match) => Number(match[2]));
    expect(radii).toHaveLength(3);
    for (const radius of radii) {
      expect(radius).toBeGreaterThanOrEqual(2);
      expect(radius).toBeLessThanOrEqual(6);
    }
  });

  it("moves in 150 to 250 ms", () => {
    const tooSlow = (value: string) => Number(value.match(/\d+/)![0]) > 250;
    expect(offenders(/\bduration-\d+/).filter((line) => tooSlow(line.split(": ").pop()!))).toEqual([]);
    const css = readFileSync("app/globals.css", "utf8");
    expect([...css.matchAll(/\b(\d+)ms\b/g)].map((match) => Number(match[1])).filter((ms) => ms > 250)).toEqual([]);
    // Looping animations only for loading placeholders, and only when the visitor allows motion.
    expect(offenders(/(?:[\w-]+:)*animate-(?:pulse|spin|ping|bounce)/, (match) => match === "motion-safe:animate-pulse")).toEqual([]);
  });

  it("sets body text in Instrument Sans and headings in Bodoni Moda, never Inter, Poppins or Montserrat", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toMatch(/import \{ Bodoni_Moda, Instrument_Sans \} from "next\/font\/google"/);
    expect(offenders(/\b(?:Inter|Poppins|Montserrat)\b/)).toEqual([]);
  });

  it("has no emoji in the interface or its words", () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]/u;
    const files = [...sources(), { file: "messages/en.json", text: readFileSync("messages/en.json", "utf8") }];
    expect(files.filter(({ text }) => emoji.test(text)).map(({ file }) => file)).toEqual([]);
  });
});
