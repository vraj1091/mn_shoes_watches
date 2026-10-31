import { expect, test } from "@playwright/test";
import { MANAGER, signInStaff, STAFF } from "./helpers";

/*
 * What each role can open (DECISIONS.md 68). Pages and the server both check: a hidden menu item
 * is not the protection, so the tests also open the addresses directly and call the upload
 * endpoint without the page.
 */
test.describe("admin roles", () => {
  test.skip(({ isMobile }) => isMobile, "Runs in the desktop project only");

  const denied = (permission: string) => new RegExp(`/admin\\?denied=${permission.replace(".", "\\.")}$`);

  test("staff handle orders and see products, and nothing else", async ({ page }) => {
    await signInStaff(page, STAFF);
    const nav = page.getByRole("navigation", { name: "Admin" });
    for (const item of ["Dashboard", "Orders", "Products", "My account"]) await expect(nav.getByRole("link", { name: item })).toBeVisible();
    for (const item of ["Categories", "Brands", "Coupons", "Customers", "Home banners", "Staff", "Activity", "Settings"]) {
      await expect(nav.getByRole("link", { name: item, exact: true })).toHaveCount(0);
    }

    for (const [path, permission] of [
      ["/admin/settings", "settings.manage"],
      ["/admin/products/new", "catalogue.manage"],
      ["/admin/coupons", "discounts.manage"],
      ["/admin/staff", "staff.manage"],
    ] as const) {
      await page.goto(path);
      await expect(page).toHaveURL(denied(permission));
      await expect(page.getByRole("status").filter({ hasText: "Your role does not include that page." })).toBeVisible();
    }

    // Products are read-only: no save buttons, no delete.
    await page.goto("/admin/products");
    await page.getByRole("main").getByRole("table").getByRole("link").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Save/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete product" })).toHaveCount(0);

    // Orders open, with the status controls.
    await page.goto("/admin/orders");
    await page.getByRole("main").getByRole("link", { name: /^MND?\d+$/ }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Order MND?\d+$/);

    // The server refuses an upload even without the page.
    const upload = await page.request.post("/api/admin/media", { multipart: { file: { name: "photo.png", mimeType: "image/png", buffer: Buffer.from("not a photo") } } });
    expect(upload.status()).toBe(403);
  });

  test("managers run the catalogue but not settings, staff or the activity log", async ({ page }) => {
    await signInStaff(page, MANAGER);
    const nav = page.getByRole("navigation", { name: "Admin" });
    for (const item of ["Orders", "Products", "Categories", "Brands", "Coupons", "Customers", "Home banners"]) await expect(nav.getByRole("link", { name: item })).toBeVisible();
    for (const item of ["Staff", "Activity", "Settings"]) await expect(nav.getByRole("link", { name: item, exact: true })).toHaveCount(0);

    for (const [path, permission] of [
      ["/admin/settings", "settings.manage"],
      ["/admin/staff", "staff.manage"],
      ["/admin/activity", "activity.view"],
    ] as const) {
      await page.goto(path);
      await expect(page).toHaveURL(denied(permission));
    }
    await page.goto("/admin/products/new");
    await expect(page).toHaveURL(/\/admin\/products\/new$/);
  });

  test("an unknown admin address shows the admin's own not-found page", async ({ page }) => {
    await signInStaff(page, STAFF);
    await page.goto("/admin/no-such-page");
    await expect(page.getByRole("heading", { name: "This page is not in the admin" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
  });
});
