import { expect, test } from "@playwright/test";
import { expectEvent, openApp } from "../support/app";

test("guest opens a tracking token and initiates invoice payment", async ({ page }) => {
  await openApp(page, "/track/e2e-token");

  await expect(page.getByText("Repair job OTR-E2E-1")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invoice" })).toBeVisible();
  await page.getByRole("button", { name: "Pay invoice" }).click();

  await expect(page).toHaveURL(/\/e2e-checkout\?flow=invoice/);
  const event = await expectEvent(page, "function.publicJobAccessActions");
  expect(event.payload.action).toBe("start_payment");
});

test("guest approves a visible quote", async ({ page }) => {
  await openApp(page, "/track/e2e-token");

  await expect(page.getByRole("heading", { name: "Quote" })).toBeVisible();
  await page.getByRole("button", { name: "Approve quote" }).click();

  const event = await expectEvent(page, "function.publicJobAccessActions");
  expect(event.payload).toMatchObject({ action: "quote_decision", approved: true });
  await expect(page.getByText("Quote approved")).toBeVisible();
});
