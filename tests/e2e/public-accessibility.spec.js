import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public landing page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact))).toEqual([]);
});

