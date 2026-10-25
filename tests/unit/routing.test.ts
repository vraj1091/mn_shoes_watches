import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decideRoute, FIXED_FILES, FIXED_SEGMENTS } from "@/lib/routing/registry";
import { notFoundHtml } from "@/lib/routing/not-found-html";

const routes = {
  categories: new Set(["mens-shoes", "mens-shoes/formal", "mens-shoes/formal/oxfords", "watches"]),
  landingPaths: new Set(["watches/under-10000"]),
  collections: new Map<string, string | null>([
    ["new-arrivals", null],
    ["watches-under-10000", "watches/under-10000"],
  ]),
  products: new Map([
    ["kensington-oxford", { status: "ACTIVE", replacement: null }],
    ["old-oxford", { status: "ARCHIVED", replacement: "kensington-oxford" }],
    ["gone-for-good", { status: "ARCHIVED", replacement: null }],
    ["coming-soon", { status: "DRAFT", replacement: null }],
  ]),
};

describe("route decisions in the proxy", () => {
  it.each([
    ["/", "pass"],
    ["/mens-shoes", "pass"],
    ["/mens-shoes/formal/oxfords/", "pass"],
    ["/watches/under-10000", "pass"],
    ["/mens-shoes/flying-shoes", "not-found"],
    ["/nothing-here", "not-found"],
    ["/product/kensington-oxford", "pass"],
    ["/product/coming-soon", "not-found"],
    ["/product/gone-for-good", "not-found"],
    ["/product/no-such-thing", "not-found"],
    ["/product/kensington-oxford/extra", "not-found"],
    ["/collections/new-arrivals", "pass"],
    ["/collections/unknown", "not-found"],
    ["/search", "pass"],
    ["/sale", "pass"],
  ])("%s → %s", (pathname, action) => {
    expect(decideRoute(pathname, routes).action).toBe(action);
  });

  it("sends archived products to their replacement and collections to their landing page", () => {
    expect(decideRoute("/product/old-oxford", routes)).toEqual({ action: "redirect", location: "/product/kensington-oxford" });
    expect(decideRoute("/collections/watches-under-10000", routes)).toEqual({ action: "redirect", location: "/watches/under-10000" });
  });

  it("knows every top-level route folder in app/, so no real page is ever answered with a 404", () => {
    const appDir = path.resolve("app");
    const folders = [...readdirSync(path.join(appDir, "(store)"), { withFileTypes: true }), ...readdirSync(appDir, { withFileTypes: true })]
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith("(") && !name.startsWith("[") && !name.startsWith("_") && name !== "api" && name !== "media");
    for (const folder of folders) expect(FIXED_SEGMENTS.has(folder), folder).toBe(true);
  });

  it("knows every file app/ serves at the root, and 404s any other file path", () => {
    // Metadata routes: robots.ts serves /robots.txt, sitemap.ts /sitemap.xml, icon.svg itself.
    const served: Record<string, string> = { "robots.ts": "robots.txt", "sitemap.ts": "sitemap.xml", "manifest.ts": "manifest.webmanifest" };
    const special = new Set(["layout.tsx", "page.tsx", "not-found.tsx", "error.tsx", "global-error.tsx", "loading.tsx", "template.tsx", "default.tsx", "globals.css"]);
    const files = readdirSync(path.resolve("app"), { withFileTypes: true })
      .filter((entry) => entry.isFile() && !special.has(entry.name))
      .map((entry) => served[entry.name] ?? entry.name);
    expect(files).toContain("robots.txt");
    for (const file of files) expect(FIXED_FILES.has(file), file).toBe(true);
    for (const file of FIXED_FILES) expect(decideRoute(`/${file}`, routes).action).toBe("pass");
    for (const pathname of ["/favicon.ico", "/wp-login.php", "/old-photo.jpg", "/mens-shoes/photo.png"]) {
      expect(decideRoute(pathname, routes).action, pathname).toBe("not-found");
    }
  });
});

describe("the proxy's 404 page", () => {
  const html = notFoundHtml({
    storeName: "MN Shoes & Watches",
    departments: [{ name: "Men's shoes", path: "mens-shoes", children: [{ name: "Formal", path: "mens-shoes/formal" }] }],
    bestsellers: [{ title: "<script>alert(1)</script>", slug: "x", minPrice: 4_499_00 }],
  });

  it("escapes data and offers search, categories and bestsellers", () => {
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('action="/search"');
    expect(html).toContain('href="/mens-shoes/formal"');
    expect(html).toContain("₹4,499");
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('lang="en-IN"');
  });
});
