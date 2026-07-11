import { expect, test } from "@playwright/test";
import { openApp } from "../support/app";

test("technician is denied the admin activity log", async ({ page }) => {
  await openApp(page, "/admin/activity", "technician");

  await expect(page.getByRole("heading", { name: "Activity log restricted" })).toBeVisible();
  await expect(page.getByText("You don't have permission to view the activity log.")).toBeVisible();
});
