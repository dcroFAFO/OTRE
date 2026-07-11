import { expect, test } from "@playwright/test";
import { openApp } from "../support/app";

test("public landing navigates to guest booking", async ({ page }) => {
  await openApp(page, "/");

  await expect(page.getByRole("heading", { level: 1, name: "On The Run Electrics" })).toBeVisible();
  await page.getByRole("link", { name: "Book a Repair" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Book your repair" })).toBeVisible();

  await page.getByRole("link", { name: /Continue as guest/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Guest repair booking" })).toBeVisible();
});
