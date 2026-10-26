import { expect, test } from "@playwright/test";
import { signInStaff } from "./helpers";

/*
 * The admin on a phone: no page may scroll sideways. Wide tables scroll inside their own box; the
 * visually hidden labels in them are contained there too (DECISIONS.md 62).
 */
test("admin pages never scroll sideways on a phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Phone layout only");
  await signInStaff(page);

  const paths = ["/admin", "/admin/orders", "/admin/products", "/admin/products/new", "/admin/categories", "/admin/brands", "/admin/banners", "/admin/banners/new"];
  await page.goto("/admin/orders");
  paths.push((await page.getByRole("main").getByRole("link", { name: /^MND?\d+$/ }).first().getAttribute("href"))!);
  await page.goto("/admin/products");
  paths.push((await page.getByRole("main").getByRole("table").getByRole("link").first().getAttribute("href"))!);
  await page.goto("/admin/categories");
  paths.push((await page.getByRole("main").getByRole("table").getByRole("link").first().getAttribute("href"))!);

  for (const path of paths) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBe(0);
  }
});
