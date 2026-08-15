import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const STATIC_ROUTES = [
  { path: "/about", heading: "Brisbane's home for electric scooter repairs", title: /About On The Run Electrics/ },
  { path: "/contact", heading: "Get in touch", title: /Contact On The Run Electrics/ },
  { path: "/terms", heading: "T's & C's", title: /Terms & Conditions/ },
];

for (const route of STATIC_ROUTES) {
  test(`${route.path} renders its public content and passes serious accessibility checks`, async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(route.path);

    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
    await expect(page.getByText("Something went wrong", { exact: true })).toHaveCount(0);
    expect(pageErrors).toEqual([]);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact))).toEqual([]);
  });
}
