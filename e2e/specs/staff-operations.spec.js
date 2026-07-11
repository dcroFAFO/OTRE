import { expect, test } from "@playwright/test";
import { expectEvent, openApp } from "../support/app";

test("technician creates a staff intake job", async ({ page }) => {
  await openApp(page, "/dashboard/jobs", "technician");

  await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  await page.getByRole("button", { name: "New Job" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Jane Smith").fill("E2E New Customer");
  await dialog.getByPlaceholder("jane@email.com").fill("new.job@example.com");
  await dialog.getByPlaceholder("Describe the issue or requested service...").fill("E2E tyre repair");
  await dialog.getByRole("button", { name: "Create Intake & Job" }).click();

  const event = await expectEvent(page, "function.staffCreateJob");
  expect(event.payload.intake.customerName).toBe("E2E New Customer");
  await expect(page.getByText(/OTR-E2E-10/).first()).toBeVisible();
});

test("technician advances the job lifecycle", async ({ page }) => {
  await openApp(page, "/dashboard/jobs", "technician");

  await page.getByRole("button", { name: /Casey Customer/ }).click();
  await page.getByRole("button", { name: "Start repair" }).click();

  const event = await expectEvent(page, "function.jobActions");
  expect(event.payload).toMatchObject({
    action: "change_status",
    jobId: "job-e2e-1",
    newStatus: "repair_in_progress",
  });
  await expect(page.getByText("Repair In Progress").first()).toBeVisible();
});

test("technician creates quote data for a job", async ({ page }) => {
  await openApp(page, "/dashboard/jobs", "technician");
  await page.evaluate(() => {
    window.__OTRE_E2E__.collections.Quote = [];
  });

  await page.getByRole("button", { name: /Casey Customer/ }).click();
  await page.getByRole("tab", { name: /Billing/ }).click();
  await page.getByPlaceholder("Diagnosis findings…").fill("E2E quote diagnosis");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  const event = await expectEvent(page, "function.quoteActions");
  expect(event.payload.action).toBe("save");
  expect(event.payload.data.diagnosis_notes).toBe("E2E quote diagnosis");
});

test("technician finalises and publishes an invoice", async ({ page }) => {
  await openApp(page, "/dashboard/jobs", "technician");

  await page.getByRole("button", { name: /Casey Customer/ }).click();
  await page.getByRole("tab", { name: /Billing/ }).click();
  await page.getByRole("button", { name: "Finalise Invoice" }).first().click();
  await expect(page.getByText("Send invoice to customer?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, send to customer" }).click();

  const event = await expectEvent(page, "function.invoicePdfActions");
  expect(event.payload.action).toBe("email");
  await expect(page.getByText("Invoice sent to customer. You can now print or download a copy.")).toBeVisible();
});
