import { expect, test } from "@playwright/test";
import { chooseRadio, signInStaff, STAFF } from "./helpers";

/*
 * The whole purchase, as a shopper does it, then the shop's side: browse a department, filter by
 * brand, open a product, pick a size, add to the bag, apply a coupon, pay cash on delivery, and
 * find the order in the admin.
 */
test("a shopper buys with a coupon and cash on delivery, and the order reaches the admin", async ({ page, browser, isMobile }) => {
  // Browse from the home page to a department.
  await page.goto("/");
  await page.getByRole("region", { name: "Shop by category" }).getByRole("link", { name: /Men's shoes/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Men's shoes");

  // Filter by brand.
  if (isMobile) {
    await page.getByRole("button", { name: /^Filters/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("checkbox", { name: /^Nike/ }).check();
    await sheet.getByRole("button", { name: "Apply filters" }).click();
  } else {
    await page.getByRole("complementary", { name: "Filters" }).getByRole("checkbox", { name: /^Nike/ }).check();
  }
  await expect(page).toHaveURL(/brand=nike/);
  await expect(page.getByRole("link", { name: /Puma/ })).toHaveCount(0);

  // Product: adding without a size asks for one.
  await page.getByRole("link", { name: /Air Jordan 1 High/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Air Jordan 1 High/);
  await page.getByRole("button", { name: "Add to bag" }).first().click();
  await expect(page.locator("#choose-prompt")).toHaveText("Choose a size first");
  await chooseRadio(page, "UK 9");
  await page.getByRole("button", { name: "Add to bag" }).first().click();

  // The bag drawer opens with the item; continue to the bag page.
  const drawer = page.getByRole("dialog", { name: /Your bag/ });
  await expect(drawer).toContainText("Air Jordan 1 High");
  await expect(drawer).toContainText("UK 9");
  await drawer.getByRole("link", { name: "View bag" }).click();
  await expect(page).toHaveURL(/\/cart$/);

  // Coupon: FLAT500 takes ₹500 off orders above ₹4,999.
  await page.getByLabel("Coupon code").fill("flat500");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("button", { name: "Remove code" })).toBeVisible();
  await expect(page.getByText("−₹500").first()).toBeVisible();

  // One-page checkout, cash on delivery.
  await page.getByRole("link", { name: "Checkout" }).last().click();
  await expect(page).toHaveURL(/\/checkout$/);
  const field = (name: string) => page.getByRole("textbox", { name, exact: true });
  await field("Email").fill("e2e.buyer@example.com");
  await field("Mobile number").fill("98765 43210");
  await field("Full name").fill("E2E Buyer");
  await field("Flat, house number, building").fill("12, Shanti Apartments");
  await field("PIN code").fill("382721");
  await field("Town or city").fill("Kalol");
  await expect(page.getByRole("combobox", { name: "State" })).toHaveValue("24"); // Gujarat, from the PIN code
  await page.getByRole("radio", { name: /Cash on delivery/ }).check();
  await expect(page.getByText("FLAT500").first()).toBeVisible();
  await page.getByRole("button", { name: "Place order" }).click();

  // Confirmation.
  await expect(page).toHaveURL(/\/order\//, { timeout: 30_000 });
  const heading = page.getByText(/^Order MN\d+/);
  await expect(heading).toBeVisible();
  const number = (await heading.innerText()).replace("Order ", "").trim();
  expect(number).toMatch(/^MN1\d{4}$/);

  // The shop sees it in the admin straight away.
  const staff = await browser.newContext({ viewport: isMobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  const admin = await staff.newPage();
  await signInStaff(admin, STAFF);
  await admin.goto(`/admin/orders?q=${number}`);
  await admin.getByRole("link", { name: number }).click();
  await expect(admin.getByRole("heading", { level: 1 })).toHaveText(`Order ${number}`);
  await expect(admin.getByRole("main")).toContainText("E2E Buyer");
  await expect(admin.getByRole("main")).toContainText("Air Jordan 1 High");
  await expect(admin.getByRole("main")).toContainText("Discount (FLAT500)");
  await expect(admin.getByRole("main")).toContainText("Cash on delivery");
  await staff.close();
});

test("a coupon applied at checkout with Enter does not place the order", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/product/kensington-plain-toe-oxford");
  await chooseRadio(page, "Black");
  await chooseRadio(page, "UK 9");
  await page.getByRole("button", { name: "Add to bag" }).first().click();
  await expect(page.getByRole("dialog", { name: /Your bag/ })).toBeVisible();

  await page.goto("/checkout");
  const coupon = page.getByRole("textbox", { name: "Coupon code" });
  await coupon.fill("welcome10");
  await coupon.press("Enter");
  await expect(page.getByRole("button", { name: "Remove code" })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("main")).toContainText("WELCOME10");
  // The coupon box sits inside the checkout form, so it must not be a nested <form>.
  expect(await page.locator("form form").count()).toBe(0);
  expect(errors).toEqual([]);
});
