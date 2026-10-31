import { expect, test, type Page } from "@playwright/test";
import { chooseRadio, latestEmailCode } from "./helpers";

/*
 * Customer accounts with email and password, confirmed by an emailed code before anything is
 * saved (DECISIONS.md 64). Codes are read from the outbox the e2e server writes to.
 */

// Compare the path itself: "/account/sign-in?next=/checkout" also ends in "/checkout".
const onPath = (path: string) => (url: URL) => url.pathname === path;
const field = (page: Page, name: string) => page.getByRole("main").getByRole("textbox", { name, exact: true });
// Password inputs have no textbox role, and the previous page stays mounted but hidden.
const password = (page: Page, name = "Password") => page.getByRole("main").getByLabel(name, { exact: true }).filter({ visible: true });

async function addOxfordToBag(page: Page) {
  await page.goto("/product/kensington-plain-toe-oxford");
  await chooseRadio(page, "Black");
  await chooseRadio(page, "UK 9");
  await page.getByRole("button", { name: "Add to bag" }).first().click();
  await expect(page.getByRole("dialog", { name: /Your bag/ })).toBeVisible();
}

test("a new customer signs up, confirms the code, signs in again and checks out", async ({ page }, testInfo) => {
  const email = `new-${testInfo.project.name}-${Date.now()}@e2e.test`;
  const secret = "Tan derby, UK 9 please";
  await addOxfordToBag(page);

  // From checkout to the sign-up form, keeping the way back.
  await page.goto("/checkout");
  await page.getByRole("link", { name: "Sign in to fill in your details" }).click();
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/account\/sign-up\?next=%2Fcheckout/);

  // Every field says what is wrong.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#sign-up-name-error")).toHaveText("Enter your name.");
  await expect(page.locator("#sign-up-email-error")).toHaveText("Enter your email address.");
  await expect(page.locator("#sign-up-phone-error")).toHaveText("Enter your mobile number.");
  await expect(page.locator("#sign-up-password-error")).toHaveText("Choose a password.");

  await field(page, "Full name").fill("Priya Shah");
  await field(page, "Email address").fill(email);
  await field(page, "Mobile number").fill("12345");
  await password(page).fill("password123");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#sign-up-phone-error")).toHaveText("Enter a 10-digit Indian mobile number.");
  await expect(page.locator("#sign-up-password-error")).toHaveText("That password is too easy to guess. Add a word or two.");

  await field(page, "Mobile number").fill("98765 43210");
  await password(page).fill(secret);
  await expect(page.getByText("Password strength: strong")).toBeVisible();
  const sentAt = Date.now();
  await page.getByRole("button", { name: "Continue" }).click();

  // Check your email: wrong code, a resend that waits a minute, then the right code.
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Send a new code in \d+ s/ })).toBeDisabled();
  const code = await latestEmailCode(email, sentAt);
  await field(page, "6-digit code").fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Confirm and create account" }).click();
  await expect(page.locator("#account-code-error")).toHaveText("That code is not right. Check the newest email from us.");
  await field(page, "6-digit code").fill(code);
  await page.getByRole("button", { name: "Confirm and create account" }).click();

  // Back where they were, signed in, with their details filled in.
  await expect(page).toHaveURL(onPath("/checkout"));
  await expect(page.getByText(`Signed in as ${email}.`)).toBeVisible();
  await expect(field(page, "Email")).toHaveValue(email);
  await expect(field(page, "Mobile number")).toHaveValue("9876543210");
  await expect(field(page, "Full name")).toHaveValue("Priya Shah");

  // Sign out, then in again with the password (a wrong one first).
  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account/sign-in?next=/checkout");
  await field(page, "Email address").fill(email);
  await password(page).fill("not the password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert").first()).toContainText("Email or password is not right.");
  await password(page).fill(secret);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(onPath("/checkout"));
  await expect(page.getByText(`Signed in as ${email}.`)).toBeVisible();

  // WELCOME10 and cash on delivery.
  await page.goto("/cart");
  await page.getByLabel("Coupon code").fill("welcome10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("button", { name: "Remove code" })).toBeVisible();
  await page.goto("/checkout");
  await field(page, "Flat, house number, building").fill("12, Shanti Apartments");
  await field(page, "PIN code").fill("382721");
  await field(page, "Town or city").fill("Kalol");
  await expect(page.getByRole("combobox", { name: "State" })).toHaveValue("24");
  await page.getByRole("radio", { name: /Cash on delivery/ }).check();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/order\//, { timeout: 30_000 });
  const number = (await page.getByText(/^Order MN\d+/).innerText()).replace("Order ", "").trim();

  // The order is in their account.
  await page.goto("/account");
  await expect(page.getByRole("main").getByText(number)).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Confirmed");
});

test("a forgotten password is replaced with an emailed code", async ({ page }, testInfo) => {
  // A guest's first order creates their customer record; setting a password turns it into an account.
  const email = `reset-${testInfo.project.name}-${Date.now()}@e2e.test`;
  await addOxfordToBag(page);
  await page.goto("/checkout");
  await field(page, "Email").fill(email);
  await field(page, "Mobile number").fill("98765 11111");
  await field(page, "Full name").fill("Rohan Mehta");
  await field(page, "Flat, house number, building").fill("4, Station Road");
  await field(page, "PIN code").fill("382721");
  await field(page, "Town or city").fill("Kalol");
  await page.getByRole("radio", { name: /Cash on delivery/ }).check();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/order\//, { timeout: 30_000 });
  const number = (await page.getByText(/^Order MN\d+/).innerText()).replace("Order ", "").trim();

  await page.goto("/account/sign-in");
  await field(page, "Email address").fill(email);
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(field(page, "Email address")).toHaveValue(email);
  const sentAt = Date.now();
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("main").getByRole("status").first()).toContainText(`If ${email} has an account or past orders with us`);

  await field(page, "6-digit code").fill(await latestEmailCode(email, sentAt));
  await password(page, "New password").fill("12345678");
  await page.getByRole("button", { name: "Save password and sign in" }).click();
  await expect(page.locator("#reset-password-error")).toHaveText("That password is too easy to guess. Add a word or two.");
  await password(page, "New password").fill("Station road shoes 4");
  await page.getByRole("button", { name: "Save password and sign in" }).click();

  await expect(page).toHaveURL(onPath("/account"));
  await expect(page.getByRole("main").getByText(number)).toBeVisible();
});

test("signed-out pages for accounts are open, the account itself is not", async ({ request }) => {
  for (const path of ["/account/sign-in", "/account/sign-up", "/account/forgot-password"]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(200);
  }
  const account = await request.get("/account", { maxRedirects: 0 });
  expect(account.status()).toBe(307);
  expect(account.headers().location).toContain("/account/sign-in?next=%2Faccount");
});
