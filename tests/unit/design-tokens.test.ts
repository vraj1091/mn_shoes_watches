import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkContrast, hex, iconSvg, palette, resolve, semantic, themeCss } from "@/lib/design/tokens";

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

  it("uses exactly Bone, Espresso and Oxblood plus the three status colours", () => {
    expect(Object.keys(palette).sort()).toEqual(["amber", "bone", "espresso", "green", "oxblood", "scarlet"]);
  });

  it("keeps the brief's exact values (Phase 3) for the 60-30-10 roles", () => {
    const light = resolve("light");
    const dark = resolve("dark");
    expect([light.canvas, light.raised, light.surface, light.line, light.ink, light.muted, light.primary, light["primary-hover"], light["on-primary"]]).toEqual([
      "#F5F1EA", "#FBF9F5", "#EDE7DD", "#E4DDD1", "#2A2320", "#6B6158", "#7A1F2B", "#631822", "#F5F1EA",
    ]);
    expect([dark.canvas, dark.raised, dark.surface, dark.line, dark.ink, dark.muted, dark.primary, dark.accent, dark["primary-hover"]]).toEqual([
      "#161210", "#201B18", "#2A2420", "#352D28", "#EDE6DB", "#A89E92", "#8E2C33", "#D2676D", "#A3363E",
    ]);
    expect([light.success, light.warning, light.error]).toEqual(["#2F6B4F", "#9A6A12", "#B42318"]);
    expect([light.tile, dark.tile]).toEqual(["#EDE7DD", "#201B18"]);
    expect(resolve("light", "chrome").canvas).toBe("#2A2320");
  });

  it("never uses pure black or pure white", () => {
    const values = Object.values(palette).flatMap((shades) => Object.values(shades) as string[]);
    expect(values.filter((value) => value === "#000000" || value === "#FFFFFF")).toEqual([]);
  });
});
