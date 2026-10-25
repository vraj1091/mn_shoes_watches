import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkContrast, hex, iconSvg, palette, semantic, themeCss } from "@/lib/design/tokens";

describe("design tokens", () => {
  it("every text and background pair passes WCAG AA in both modes", () => {
    const failures = checkContrast().filter((result) => !result.pass);
    expect(failures.map((f) => `${f.mode}: ${f.fg} on ${f.bg} ${f.ratio.toFixed(2)}`)).toEqual([]);
  });

  it("app/theme.css and app/icon.svg are up to date (run npm run tokens)", () => {
    expect(readFileSync("app/theme.css", "utf8").replace(/\r\n/g, "\n")).toBe(themeCss());
    expect(readFileSync("app/icon.svg", "utf8").replace(/\r\n/g, "\n")).toBe(iconSvg());
  });

  it("every semantic token points at a palette shade", () => {
    for (const [name, value] of Object.entries(semantic)) {
      expect(hex(value.light), `${name} light`).toMatch(/^#[0-9A-F]{6}$/);
      expect(hex(value.dark), `${name} dark`).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("no component, page or library file hard-codes a colour", () => {
    const allowed = new Set([path.join("lib", "design", "tokens.ts")]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const file = path.join(dir, name);
        if (statSync(file).isDirectory()) {
          if (name !== "generated") walk(file);
        } else if (/\.(tsx?|css)$/.test(name) && !allowed.has(file) && file !== path.join("app", "theme.css")) {
          const source = readFileSync(file, "utf8");
          if (/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])|\brgba?\(|\bhsla?\(|\boklch\(/.test(source)) offenders.push(file);
        }
      }
    };
    ["app", "components", "lib", "emails"].forEach(walk);
    expect(offenders).toEqual([]);
  });

  it("uses exactly the three families plus the two status colours", () => {
    expect(Object.keys(palette).sort()).toEqual(["brass", "graphite", "green", "navy", "red"]);
  });
});
