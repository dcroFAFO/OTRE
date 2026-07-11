import { expect, test } from "@playwright/test";
import { expectEvent, openApp } from "../support/app";

test("guest submits a repair booking", async ({ page }) => {
  await openApp(
    page,
    "/book/guest?scooter_make_model=Segway%20Ninebot%20MAX%20G30&scooter_issue_summary=Brake%20service",
  );

  await page.getByLabel(/^Name/).fill("Guest Rider");
  await page.getByLabel(/^Email/).fill("guest@example.com");
  await page.getByLabel(/^Phone/).fill("0412 345 678");
  await page.getByRole("button", { name: /Next/ }).click();

  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Submit Repair Request" }).click();

  await expect(page.getByRole("heading", { name: "Your repair request has been submitted." })).toBeVisible();
  await expect(page.getByText("OTR-E2E-BOOKING")).toBeVisible();
  const event = await expectEvent(page, "function.createBooking");
  expect(event.payload.customer_email).toBe("guest@example.com");
  expect(event.payload.phone_e164).toBe("+61412345678");
});
