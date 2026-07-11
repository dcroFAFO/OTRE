import { expect, test } from "@playwright/test";
import { expectEvent, openApp } from "../support/app";

test("guest adds a product and starts store checkout", async ({ page }) => {
  await openApp(page, "/store");

  await expect(page.getByText("E2E Brake Pad Set")).toBeVisible();
  await page.getByRole("button", { name: "Add" }).click();
  await page.locator("header button").click();
  await expect(page.getByText("Your cart")).toBeVisible();
  await page.getByRole("button", { name: "Checkout" }).click();

  const dialog = page.getByRole("dialog");
  const inputs = dialog.locator("input");
  await inputs.nth(0).fill("Store Customer");
  await inputs.nth(1).fill("0412 345 678");
  await inputs.nth(2).fill("store@example.com");
  await dialog.locator("textarea").first().fill("11 Test Street, Brisbane QLD 4000");
  await dialog.getByRole("button", { name: "Pay with Stripe" }).click();

  await expect(page).toHaveURL(/\/e2e-checkout\?flow=store/);
  const event = await expectEvent(page, "function.createStoreCheckout");
  expect(event.payload.customer.customer_email).toBe("store@example.com");
});
