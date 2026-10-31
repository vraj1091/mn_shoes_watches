import { expect, test } from "@playwright/test";
import { BASE_URL, latestEmailCode, latestStaffLink, OWNER, saveTotpSecret, signInStaff, totp } from "./helpers";

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
    saveTotpSecret(OWNER.email, secret);

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

  test("the owner invites staff, who choose their own password; switching them off ends their session", async ({ page, browser }) => {
    const helper = { name: "Invited Helper", email: `helper-${Date.now()}@e2e.test`, password: "helper-password-123" };
    await signInStaff(page, OWNER);
    await page.goto("/admin/staff");
    const main = page.getByRole("main");
    const sentAt = Date.now();
    await main.getByLabel("Name").fill(helper.name);
    await main.getByLabel("Email").fill(helper.email);
    await main.getByRole("combobox", { name: /^Role(?! for)/ }).selectOption("STAFF");
    await page.getByRole("button", { name: "Send invite", exact: true }).click();
    await expect(main.getByText(`Invite sent to ${helper.email}`)).toBeVisible();
    const row = main.getByRole("row").filter({ hasText: helper.email });
    await expect(row).toContainText("Invite not accepted");

    // The invited person opens the emailed link in their own browser and chooses a password.
    const theirs = await browser.newContext({ baseURL: BASE_URL });
    const invited = await theirs.newPage();
    await invited.goto(await latestStaffLink(helper.email, sentAt));
    await expect(invited.getByRole("heading", { name: `Welcome, ${helper.name}` })).toBeVisible();
    await invited.getByLabel("New password", { exact: true }).fill("short");
    await invited.getByLabel("New password again").fill("short");
    await invited.getByRole("button", { name: "Set password" }).click();
    await expect(invited.getByRole("main").getByRole("alert")).toContainText("at least 12 characters");
    await invited.getByLabel("New password", { exact: true }).fill(helper.password);
    await invited.getByLabel("New password again").fill(helper.password);
    await invited.getByRole("button", { name: "Set password" }).click();
    await expect(invited.getByText("Your password is set.")).toBeVisible();

    // The link works once.
    await invited.reload();
    await expect(invited.getByRole("heading", { name: "This link no longer works" })).toBeVisible();

    await signInStaff(invited, helper);
    const nav = invited.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Orders" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);

    // The owner switches the account off: the open session ends and signing in is refused.
    await page.reload();
    await row.getByRole("button", { name: "Switch off" }).click();
    await row.getByRole("button", { name: "Switch off" }).click();
    await expect(page.getByRole("status").filter({ hasText: `${helper.name} is signed out and can no longer sign in.` })).toBeVisible();
    await expect(row).toContainText("Switched off");

    await invited.goto("/admin/orders");
    await expect(invited).toHaveURL(/\/admin\/sign-in$/);
    await invited.getByLabel("Email").fill(helper.email);
    await invited.getByLabel("Password").fill(helper.password);
    await invited.getByRole("button", { name: "Sign in" }).click();
    await expect(invited.getByRole("main").getByRole("alert")).toHaveText("This account is switched off. Ask the shop owner to switch it back on.");
    await theirs.close();

    // Every step is in the activity log.
    await page.goto("/admin/activity");
    await expect(main).toContainText(`Invited ${helper.name} (${helper.email}) as Staff.`);
    await expect(main).toContainText(`${helper.name} set a new password from an emailed link.`);
    await expect(main).toContainText(`Switched off ${helper.name}’s account.`);
  });
});
