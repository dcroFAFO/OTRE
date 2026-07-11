import { expect, test } from "@playwright/test";
import { expectEvent, openApp } from "../support/app";

test("registration begins mobile verification", async ({ page }) => {
  await openApp(page, "/register");

  await page.getByLabel("Email").fill("new.customer@example.com");
  await page.getByLabel("Mobile number").fill("0412 345 678");
  await page.getByLabel("Password", { exact: true }).fill("StrongPass123!");
  await page.getByLabel("Confirm Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Send mobile security code" }).click();

  await expect(page.getByRole("heading", { name: "Verify your mobile" })).toBeVisible();
  const event = await expectEvent(page, "function.sendSignupPhoneOtp");
  expect(event.payload.email).toBe("new.customer@example.com");
});

test("customer completes profile setup and reaches the portal", async ({ page }) => {
  await openApp(page, "/profile-setup?next=%2Fportal", "customer");

  await expect(page.getByRole("heading", { name: "Finish your customer profile" })).toBeVisible();
  await page.getByRole("combobox").first().click();
  await page.getByText("Segway", { exact: true }).click();
  await page.getByRole("combobox").nth(1).click();
  await page.getByText("Ninebot MAX G30", { exact: true }).click();
  await page.getByRole("button", { name: "Continue to book a job" }).click();

  await expect(page).toHaveURL(/\/portal/);
  await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();
  await expect(page.getByText("Segway Ninebot Max G30")).toBeVisible();
  await expect(page.getByText("Brake service required")).toBeVisible();
  await expectEvent(page, "function.claimCustomerJobs");
});
