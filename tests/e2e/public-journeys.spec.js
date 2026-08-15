import { expect, test } from "@playwright/test";

const PUBLIC_JOURNEYS = [
  { path: "/store", heading: "All products" },
  { path: "/service-pricing", heading: "Clear pricing for scooter repairs & servicing" },
  { path: "/book", heading: "Tell us about your scooter" },
  { path: "/login", heading: "Welcome back" },
  { path: "/register", heading: "Create your account" },
];

test("core public journeys render without the application error boundary", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const journey of PUBLIC_JOURNEYS) {
    const response = await page.goto(journey.path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: journey.heading })).toBeVisible();
    await expect(page.getByText("Something went wrong", { exact: true })).toHaveCount(0);
  }

  expect(pageErrors).toEqual([]);
});

test("guest booking reports required contact fields before any verification request", async ({ page }) => {
  await page.goto("/book");
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("Please enter your name.", { exact: true })).toBeVisible();
  await expect(page.getByText("Enter a valid email address.", { exact: true })).toBeVisible();
  await expect(page.getByText("Please enter your phone number.", { exact: true })).toBeVisible();
  await expect(page.locator("#booking-name")).toBeFocused();
});

test("authentication entry points expose labelled, recoverable forms", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();

  await page.goto("/register");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Mobile number")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send mobile security code" })).toBeEnabled();
});

test("the public catalogue is enquiry-only and exposes no online checkout action", async ({ page }) => {
  await page.goto("/store");

  await expect(page.getByText("Purchases and payment are arranged directly with the team.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /checkout|pay online|shopping cart/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /checkout|pay online|shopping cart/i })).toHaveCount(0);
});
