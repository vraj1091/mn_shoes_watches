import { expect, test } from "@playwright/test";
import { chooseRadio } from "./helpers";

test.describe("storefront shell", () => {
  test("home renders header, departments and footer from the database", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-IN");
    // The first hero banner (demo data) is the page heading.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Automatic watches that wind themselves");
    const departments = page.getByRole("region", { name: "Shop by category" }).getByRole("link");
    await expect(departments).toHaveCount(4);
    await expect(departments.first()).toHaveAttribute("href", "/mens-shoes");
    await expect(page.getByRole("contentinfo")).toContainText("Kalol");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });

  test("the whole page is in the first HTML response, not streamed in later", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain("Shop by category");
    expect(html).not.toMatch(/<div hidden id="S:/);
  });

  test("touch targets in the header are at least 44 × 44 px", async ({ page }) => {
    await page.goto("/");
    const controls = page.locator("header").getByRole("link").or(page.locator("header").getByRole("button"));
    for (const control of await controls.all()) {
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      expect(box!.height, await control.innerText()).toBeGreaterThanOrEqual(44);
    }
  });

  test("dark mode follows the device and the theme switch overrides it", async ({ page, isMobile }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await background()).toBe("rgb(22, 18, 16)"); // #161210, the warm dark page
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await chooseRadio(page, "Light", page.getByRole("dialog", { name: "Menu" }));
    } else {
      await page.getByRole("button", { name: /^Colour theme/ }).click();
      await page.getByRole("menuitemradio", { name: "Light" }).click();
    }
    expect(await background()).toBe("rgb(245, 241, 234)"); // Bone #F5F1EA
    await page.reload();
    expect(await background()).toBe("rgb(245, 241, 234)");
    // No flash: the class is on <html> before the page paints.
    expect(await page.evaluate(() => document.documentElement.className)).toContain("light");
  });

  test("phone menu opens as a modal, locks the page and closes with Escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "The menu button only shows on phones");
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: "Open menu" });
    await menuButton.click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");

    await menu.locator("summary", { hasText: "Men's shoes" }).click();
    await expect(menu.getByRole("link", { name: "All men's shoes" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
    await expect(menuButton).toBeFocused();
  });

  test("unknown pages return 404 with a way back", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We could not find that page");
  });

  test("health check reports the database in WAL mode", async ({ request }) => {
    const body = await (await request.get("/api/health")).json();
    expect(body).toMatchObject({ status: "ok", database: { reachable: true, journalMode: "wal" } });
  });

  test("newsletter sign-up confirms", async ({ page }) => {
    await page.goto("/");
    const form = page.getByRole("region", { name: "New arrivals, once a fortnight" });
    await form.getByPlaceholder("Email address").fill(`news-${Date.now()}@e2e.test`);
    await form.getByRole("button", { name: "Subscribe" }).click();
    await expect(form.getByRole("status")).toHaveText("Thanks. You are on the list.");
  });
});

test.describe("search engines and link previews", () => {
  test("robots.txt points at the sitemap, and every sitemap address answers 200", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/^Sitemap: http:\/\/localhost:\d+\/sitemap\.xml$/m);
    expect(robots).toContain("Disallow: /checkout");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]!).pathname);
    expect(urls).toContain("/");
    expect(urls).toContain("/product/air-jordan-1-high-red-white-black");
    const failures: string[] = [];
    for (const url of urls) {
      const response = await request.get(url, { maxRedirects: 0 });
      if (response.status() !== 200) failures.push(`${response.status()} ${url}`);
    }
    expect(failures).toEqual([]);
  });

  test("a product page describes itself to search engines and link previews", async ({ page }) => {
    await page.goto("/product/air-jordan-1-high-red-white-black");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const data = blocks.flatMap((block) => [JSON.parse(block)].flat()) as { "@type": string; [key: string]: unknown }[];
    const product = data.find((item) => item["@type"] === "Product");
    expect(product).toMatchObject({ name: "Air Jordan 1 High, red, white and black", brand: { name: "Nike" }, offers: { priceCurrency: "INR" } });
    expect(data.find((item) => item["@type"] === "BreadcrumbList")).toBeTruthy();

    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(image).toMatch(/^http:\/\/localhost:\d+\/.+\.webp/);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "MN Shoes & Watches");
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_IN");
  });

  test("the home page describes the shop, and other pages fall back to the shop's preview card", async ({ page, request }) => {
    await page.goto("/");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.flatMap((block) => [JSON.parse(block)].flat()).map((item: { "@type": string }) => item["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Store", "WebSite"]));

    await page.goto("/about");
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/og\.png$/);
    expect((await request.get("/og.png")).headers()["content-type"]).toBe("image/png");
  });
});
