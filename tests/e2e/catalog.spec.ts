import { expect, test, type Page } from "@playwright/test";
import { chooseRadio } from "./helpers";

// Demo catalogue from `npm run seed` (DEMO_OFFLINE=1 in the e2e server, so the data never changes).
const OXFORD = "/product/kensington-plain-toe-oxford";
const WATCH = "/product/iwc-ingenieur-automatic-steel";

const canonical = (page: Page) => page.locator('link[rel="canonical"]').getAttribute("href");
const robots = (page: Page) => page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null);

test.describe("category pages", () => {
  test("list the department's products with breadcrumbs, intro and a clean canonical", async ({ page }) => {
    const response = await page.goto("/mens-shoes");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Men's shoes");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Home");
    await expect(page.getByText("13 products", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kensington plain-toe Oxford" }).first()).toHaveAttribute("href", OXFORD);
    expect(await canonical(page)).toMatch(/\/mens-shoes$/);
    expect(await robots(page)).toBeNull();
  });

  test("subcategory paths work at every depth", async ({ page }) => {
    await page.goto("/mens-shoes/formal/oxfords");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oxfords");
    await expect(page.getByRole("link", { name: "Kensington plain-toe Oxford" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Air Jordan 1 High/ })).toHaveCount(0);
  });

  test("filtered pages are noindex and point their canonical at the clean URL", async ({ page }) => {
    await page.goto("/mens-shoes?colour=black&sort=price-asc");
    expect(await robots(page)).toBe("noindex, follow");
    expect(await canonical(page)).toMatch(/\/mens-shoes$/);
    await expect(page.getByRole("link", { name: "Remove filter: Black" })).toBeVisible();
  });

  test("sorting by price puts the cheapest first", async ({ page }) => {
    await page.goto("/mens-shoes?sort=price-asc");
    const prices = await page.locator("main ul li").filter({ has: page.locator("a[href^='/product/']") }).evaluateAll((items) =>
      items.map((item) => Number((item.textContent ?? "").match(/₹([\d,]+)/)?.[1]?.replace(/,/g, ""))),
    );
    expect(prices.length).toBeGreaterThan(1);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test("a filter narrows the list and the URL can be shared", async ({ page, isMobile }) => {
    await page.goto("/mens-shoes");
    if (isMobile) {
      await page.getByRole("button", { name: /^Filters/ }).click();
      const sheet = page.getByRole("dialog", { name: "Filters" });
      await sheet.getByRole("checkbox", { name: /^Suede/ }).check();
      await sheet.getByRole("button", { name: "Apply filters" }).click();
    } else {
      await page.getByRole("complementary", { name: "Filters" }).getByRole("checkbox", { name: /^Suede/ }).check();
    }
    await expect(page).toHaveURL(/upper_material=suede/);
    await expect(page.getByText("2 products", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mayfair suede Chelsea boot" }).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText("2 products", { exact: true })).toBeVisible();
  });

  test("filters still work without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto("/mens-shoes");
    const sidebar = page.getByRole("complementary", { name: "Filters" });
    await sidebar.getByRole("checkbox", { name: /^Suede/ }).check();
    await sidebar.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/upper_material=suede/);
    await expect(page.getByText("2 products", { exact: true })).toBeVisible();
    await context.close();
  });

  test("brand is a filter and has its own page", async ({ page }) => {
    await page.goto("/watches?brand=rolex");
    await expect(page.getByRole("link", { name: /Submariner Date/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Ingenieur/ })).toHaveCount(0);

    const response = await page.goto("/brands/rolex");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rolex");
    await page.goto("/brands");
    await expect(page.getByRole("main").getByRole("link", { name: /Rolex/ }).first()).toHaveAttribute("href", "/brands/rolex");
  });

  test("collection landing paths sit under their category", async ({ page }) => {
    const response = await page.goto("/watches/under-10000");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Watches under ₹10,000");
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link", { name: "Watches" })).toHaveAttribute("href", "/watches");
    await expect(page.getByRole("link", { name: /Moon-phase chronograph, gold-tone/ }).first()).toBeVisible(); // ₹7,599
    await expect(page.getByRole("link", { name: /Submariner|Datejust|Cellini/ })).toHaveCount(0);
  });

  test("the collection URL of a landing page redirects permanently to it", async ({ request }) => {
    const response = await request.get("/collections/watches-under-10000", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toMatch(/\/watches\/under-10000$/);
  });

  test("the sale page shows only reduced products", async ({ page }) => {
    await page.goto("/sale");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sale");
    const cards = page.locator("main ul li").filter({ has: page.locator("a[href^='/product/']") });
    expect(await cards.count()).toBeGreaterThan(0);
    for (const card of await cards.all()) await expect(card.locator("s")).toHaveCount(1);
  });

  test("unknown categories, products and brands return a real 404", async ({ request }) => {
    for (const path of ["/mens-shoes/not-a-category", "/product/not-a-product", "/collections/not-a-collection", "/brands/not-a-brand"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(await response.text(), path).toContain("We could not find that page");
    }
  });

  test("robots.txt is served and unknown file paths are real 404s", async ({ request }) => {
    const robotsTxt = await request.get("/robots.txt");
    expect(robotsTxt.status()).toBe(200);
    expect(robotsTxt.headers()["content-type"]).toContain("text/plain");
    const body = await robotsTxt.text();
    for (const rule of ["Disallow: /admin", "Disallow: /checkout", "Disallow: /search"]) expect(body).toContain(rule);

    expect((await request.get("/icon.svg")).status()).toBe(200);
    for (const path of ["/wp-login.php", "/old-photo.jpg", "/favicon.ico", "/media/not-a-file.webp"]) expect((await request.get(path)).status(), path).toBe(404);
  });
});

test.describe("product page", () => {
  test("renders price, options, details and related products in the first response", async ({ page, request }) => {
    const html = await (await request.get(OXFORD)).text();
    expect(html).toContain("Kensington plain-toe Oxford");
    expect(html).toContain("Key specifications");
    expect(html).not.toMatch(/<div hidden id="S:/);

    await page.goto(OXFORD);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kensington plain-toe Oxford");
    await expect(page.getByText("₹4,499").first()).toBeVisible();
    await expect(page.getByText("18% off").first()).toBeVisible();
    await expect(page.getByText("incl. all taxes")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Complete the look" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You may also like" })).toBeVisible();
    expect(await canonical(page)).toMatch(/\/product\/kensington-plain-toe-oxford$/);
  });

  test("choosing a colour and size shows its stock and puts the variant in the URL", async ({ page }) => {
    await page.goto(OXFORD);
    await chooseRadio(page, "Black");
    await chooseRadio(page, "UK 9");
    const stock = page.getByRole("status").filter({ hasText: "SKU MN-KEN-BLA-9" });
    await expect(stock).toContainText(/In stock|Only \d+ left/);
    await expect(page).toHaveURL(/variant=/);

    // The shared link opens on the same size.
    await page.reload();
    await expect(page.getByRole("radio", { name: "UK 9", exact: true })).toBeChecked();
  });

  test("a sold-out size offers a back-in-stock email", async ({ page }) => {
    await page.goto(OXFORD);
    await chooseRadio(page, "Black");
    await chooseRadio(page, "UK 8, sold out");
    await expect(page.getByText("Sold out", { exact: true })).toBeVisible();
    await page.getByPlaceholder("Email address").first().fill(`notify-${Date.now()}@e2e.test`);
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByText("Done. We will email you when it is back in stock.")).toBeVisible();
  });

  test("the size guide opens as a dialog and closes with Escape", async ({ page }) => {
    await page.goto(OXFORD);
    const trigger = page.getByRole("button", { name: "Size guide" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Men's shoes (UK/India)" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("columnheader", { name: "Foot length (cm)" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("watches show the dial drawn on a wrist and what the water resistance means", async ({ page }) => {
    await page.goto(WATCH);
    await expect(page.getByRole("img", { name: "How 40 mm looks on a wrist" })).toBeVisible();
    await expect(page.getByText(/swimming and snorkelling/).first()).toBeVisible();
    await expect(page.getByText(/Size exchange/)).toHaveCount(0);
  });

  test("perfumes show the notes pyramid", async ({ page }) => {
    await page.goto("/product/oud-noir-eau-de-parfum");
    const notes = page.getByRole("region", { name: "Fragrance notes" });
    await expect(notes.getByText("Top notes")).toBeVisible();
    await expect(notes.getByText("Base notes")).toBeVisible();
  });

  test("recently viewed remembers the products opened on this device", async ({ page }) => {
    await page.goto("/product/mitti-attar");
    // Saved once the page is interactive.
    await page.waitForFunction(() => localStorage.getItem("mn-recently-viewed")?.includes("mitti-attar"));
    await page.goto(OXFORD);
    const recent = page.getByRole("region", { name: "Recently viewed" });
    await expect(recent.getByRole("link", { name: /Mitti attar/ })).toBeVisible();
    await expect(recent.getByRole("link", { name: /Kensington plain-toe Oxford/ })).toHaveCount(0);
  });

  test("buttons and swatches meet the 44 px touch target", async ({ page }) => {
    await page.goto(OXFORD);
    const targets = page.locator("main fieldset label").or(page.getByRole("button", { name: "Size guide" }));
    for (const target of await targets.all()) {
      const box = await target.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("search", () => {
  test("finds products by name", async ({ page }) => {
    await page.goto("/search?q=oxford");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Results for “oxford”");
    await expect(page.getByRole("link", { name: "Kensington plain-toe Oxford" }).first()).toBeVisible();
    expect(await robots(page)).toBe("noindex, follow");
  });

  test("corrects a misspelling", async ({ page }) => {
    await page.goto("/search?q=chronograf");
    await expect(page.getByText("No results for “chronograf”. Showing results for “chronograph”.")).toBeVisible();
    await expect(page.getByRole("link", { name: /moon-phase chronograph/i }).first()).toBeVisible();
  });

  test("an empty result suggests categories and bestsellers", async ({ page }) => {
    await page.goto("/search?q=zzzzqqq");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("No results for “zzzzqqq”");
    await expect(page.getByRole("heading", { name: "Popular categories" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bestsellers" })).toBeVisible();
  });

  test("suggestions appear while typing and open the product", async ({ page }) => {
    await page.goto("/search");
    const box = page.getByRole("main").getByRole("combobox");
    await box.fill("kensing");
    const option = page.getByRole("option", { name: /Kensington plain-toe Oxford/ });
    await expect(option).toBeVisible();
    await box.press("ArrowDown");
    await box.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${OXFORD}$`));
  });

  test("suggestions match a word inside a product name", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("main").getByRole("combobox").fill("chelsea");
    await expect(page.getByRole("option", { name: /Mayfair suede Chelsea boot/ })).toBeVisible();
  });
});

test("phone pages never scroll sideways", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Phone layout only");
  for (const path of ["/mens-shoes", OXFORD, WATCH, "/search?q=watch", "/sale", "/brands", "/cart", "/checkout"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBe(0);
  }
});
