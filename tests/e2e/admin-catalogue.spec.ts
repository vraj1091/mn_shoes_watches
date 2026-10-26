import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { BASE_URL, signInStaff } from "./helpers";

// Two of the demo photos stand in for photos a shop owner would upload.
const PHOTOS = [1, 2].map((n) => path.resolve(`public/demo/mens-shoes/puma-future-rider-yellow-blue/${n}.webp`));
const TITLE = "Trail runner, grey";

/*
 * One signed-in page for the whole group: staff sign-in is rate-limited (10 per 15 minutes), and
 * the shop-flow and two-factor tests sign in too. The new product is always deleted afterwards,
 * so the category counts in catalog.spec.ts stay as seeded.
 */
test.describe.serial("catalogue admin", () => {
  test.skip(({ isMobile }) => isMobile, "Runs in the desktop project only");

  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (testInfo.project.name !== "desktop") return; // the tests below skip on phones
    page = await browser.newPage({ baseURL: BASE_URL, viewport: { width: 1280, height: 900 } });
    await signInStaff(page);
  });

  test.afterAll(async () => {
    if (!page) return;
    await page.goto(`/admin/products?q=${encodeURIComponent("Trail runner")}`);
    const link = page.getByRole("link", { name: TITLE });
    if (await link.count()) {
      await link.click();
      await page.getByRole("button", { name: "Delete product" }).click();
      await page.getByRole("button", { name: "Delete for good" }).click();
      await page.waitForURL(/deleted=1/);
    }
    await page.close();
  });

  test("a new product with photos and sizes appears in the shop once it is active", async () => {
    await page.goto("/admin/products/new");
    await page.getByLabel("Product name").fill(TITLE);
    await page.getByLabel("Category").selectOption({ label: "  Sneakers" });
    await page.getByLabel("Brand").selectOption({ label: "Puma" });
    await page.getByLabel("Price (₹, incl. GST)").fill("3,499");
    await page.getByLabel("Original price (₹)").fill("3999");
    await page.getByLabel("In UK shoe sizes").check();
    await page.getByLabel("Stock per size").fill("4");
    await page.getByRole("button", { name: "Create draft and add photos" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[^/?]+\?created=1$/);

    // A draft without photos cannot go on sale.
    const status = page.getByRole("combobox", { name: "Status" });
    await status.selectOption("ACTIVE");
    await page.getByRole("button", { name: "Save", exact: true }).first().click();
    await expect(page.getByText("Before this product can go on sale, add at least one photo.")).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(PHOTOS);
    await expect(page.getByText("2 photos uploaded.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Main photo")).toBeVisible();
    await page.getByRole("button", { name: "Move photo 2 earlier" }).click();

    await status.selectOption("ACTIVE");
    await page.getByRole("textbox", { name: "Summary" }).fill("A light trail runner with a grippy sole.");
    await page.getByRole("button", { name: "Save", exact: true }).first().click();
    await expect(page.getByText("Saved. The product is on sale.")).toBeVisible();
    await expect(status).toHaveValue("ACTIVE");

    // On the shop at once: product page, category and search.
    await page.goto("/product/trail-runner-grey");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE);
    await expect(page.getByText("₹3,499").first()).toBeVisible();
    await expect(page.getByRole("radio", { name: "UK 9", exact: true })).toBeAttached();
    const photo = page.getByRole("main").locator('img[src*="%2Fmedia%2F"]').first();
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

    await page.goto("/mens-shoes/casual/sneakers");
    await expect(page.getByRole("link", { name: new RegExp(TITLE) }).first()).toBeVisible();
    await page.goto("/search?q=trail+runner");
    await expect(page.getByRole("link", { name: new RegExp(TITLE) }).first()).toBeVisible();
  });

  test("a price change shows in the shop straight away", async () => {
    await page.goto(`/admin/products?q=${encodeURIComponent("Trail runner")}`);
    await page.getByRole("link", { name: TITLE }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE);
    await page.getByRole("textbox", { name: "Price for UK 9", exact: true }).fill("2999");
    await page.getByRole("button", { name: "Save prices and stock" }).click();
    await expect(page.getByText("Prices and stock saved.")).toBeVisible();

    await page.goto("/product/trail-runner-grey");
    await page.locator("label").filter({ has: page.getByRole("radio", { name: "UK 9", exact: true }) }).click();
    await expect(page.getByText("₹2,999").first()).toBeVisible();
  });

  test("uploading a real photo replaces a placeholder", async () => {
    await page.goto("/admin/products?photo=placeholder");
    const row = page.getByRole("row").filter({ hasText: "Replace photo" }).first();
    const title = (await row.getByRole("link").innerText()).trim();
    await row.getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    const warning = page.getByRole("note").filter({ hasText: "Replace photo." });
    await expect(warning).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(PHOTOS[0]!);
    await expect(page.getByText("1 photo uploaded.")).toBeVisible({ timeout: 30_000 });
    await expect(warning).toHaveCount(0);
    await expect(page.getByText("Photo 2", { exact: true })).toHaveCount(0); // the placeholder is gone, not kept as a second photo

    await page.goto("/admin/products?photo=placeholder");
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);
  });

  test("deleting a product that was never ordered removes it from the shop", async () => {
    await page.goto(`/admin/products?q=${encodeURIComponent("Trail runner")}`);
    await page.getByRole("link", { name: TITLE }).click();
    await page.getByRole("button", { name: "Delete product" }).click();
    await page.getByRole("button", { name: "Delete for good" }).click();
    await expect(page).toHaveURL(/\/admin\/products\?deleted=1$/);
    expect((await page.request.get("/product/trail-runner-grey")).status()).toBe(404);
  });
});
