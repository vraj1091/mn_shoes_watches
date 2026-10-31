import { expect, test } from "@playwright/test";
import { latestEmailCode, OWNER, totp } from "./helpers";

test.describe("customer sign-in with an emailed code", () => {
  test("signs in, shows the account, signs out", async ({ page }, testInfo) => {
    const email = `shopper-${testInfo.project.name}-${Date.now()}@e2e.test`;
    await page.goto("/account");
    await expect(page).toHaveURL(/\/account\/sign-in\?next=%2Faccount|\/account\/sign-in\?next=\/account/);

    // The page opens on email and password; codes are one click away.
    await page.getByRole("button", { name: "Email me a code instead" }).click();
    const sentAt = Date.now();
    await page.getByRole("main").getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("status").first()).toContainText(email);

    await page.getByRole("textbox", { name: "6-digit code" }).fill("000000");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator("#account-code-error")).toContainText("not right");

    await page.getByRole("textbox", { name: "6-digit code" }).fill(await latestEmailCode(email, sentAt));
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/account\/sign-in/);
  });

  test("rejects an invalid email before sending anything", async ({ page }) => {
    await page.goto("/account/sign-in");
    await page.getByRole("button", { name: "Email me a code instead" }).click();
    await page.getByRole("main").getByRole("textbox", { name: "Email address" }).fill("not-an-email");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.locator("#code-email-error")).toHaveText("Enter a valid email address.");
  });
});

test.describe.serial("staff sign-in with two-factor", () => {
  // Runs once: it turns two-factor on for the seeded owner, which changes later sign-ins.
  test.skip(({ isMobile }) => isMobile, "Runs in the desktop project only");

  let secret = "";

  test("admin is closed to signed-out visitors", async ({ request }) => {
    const response = await request.get("/admin", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/admin/sign-in");
  });

  test("a wrong password is refused", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Email or password is not right.");
  });

  test("the owner must set up two-factor before using the admin", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/account\?setup=two-factor/);

    // Every admin page sends the owner back here until two-factor is on.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/account\?setup=two-factor/);

    await page.getByLabel("Your password").fill(OWNER.password);
    await page.getByRole("button", { name: "Start set-up" }).click();
    await expect(page.getByRole("img", { name: "QR code for your authenticator app" })).toBeVisible();
    secret = (await page.locator(".select-all").innerText()).trim();
    expect(secret).toMatch(/^[A-Z2-7]{16,}$/);

    await page.getByLabel("6-digit code").fill(totp(secret));
    await page.getByRole("button", { name: "Turn on two-factor" }).click();
    await expect(page.getByText("Two-factor sign-in is on.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("listitem").filter({ hasText: /^[A-Za-z0-9-]{10,}$/ })).toHaveCount(10);

    await page.getByRole("button", { name: "I have saved them" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Before you take real orders" })).toBeVisible();
  });

  test("signing in again asks for the authenticator code", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/two-factor/);

    await page.getByLabel("6-digit code").fill("123456" === totp(secret) ? "654321" : "123456");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("not right");

    await page.getByLabel("6-digit code").fill(totp(secret));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Hello, Test" })).toBeVisible();
  });
});
