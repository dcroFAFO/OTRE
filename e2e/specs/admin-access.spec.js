import { expect, test } from "@playwright/test";
import { openApp, recordedEvents } from "../support/app";

test("technician is denied the admin activity log", async ({ page }) => {
  await openApp(page, "/admin/activity", "technician");

  await expect(page.getByRole("heading", { name: "Activity log restricted" })).toBeVisible();
  await expect(page.getByText("You don't have permission to view the activity log.")).toBeVisible();
  expect(await recordedEvents(page, "entity.AuditEvent.list")).toHaveLength(0);
});

test("technician cannot mount the admin parts catalogue", async ({ page }) => {
  await openApp(page, "/dashboard/parts", "technician");

  await expect(page.getByRole("heading", { name: "Admin access only" })).toBeVisible();
  expect(await recordedEvents(page, "entity.Product.list")).toHaveLength(0);
  expect(await recordedEvents(page, "entity.Product.filter")).toHaveLength(0);
});

test("technician cannot mount admin feedback data", async ({ page }) => {
  await openApp(page, "/admin/feedback", "technician");

  await expect(page.getByRole("heading", { name: "Admin access only" })).toBeVisible();
  expect(await recordedEvents(page, "entity.Feedback.list")).toHaveLength(0);
  expect(await recordedEvents(page, "entity.Feedback.filter")).toHaveLength(0);
});

test("customer cannot mount staff customer-management data", async ({ page }) => {
  await openApp(page, "/admin/clients", "customer");

  await expect(page.getByRole("heading", { name: "Staff access only" })).toBeVisible();
  expect(await recordedEvents(page, "function.customerActions")).toHaveLength(0);
});

test("customer cannot mount staff dashboard data", async ({ page }) => {
  await openApp(page, "/dashboard", "customer");

  await expect(page.getByRole("heading", { name: "Staff access only" })).toBeVisible();
  expect(await recordedEvents(page, "entity.Job.list")).toHaveLength(0);
  expect(await recordedEvents(page, "entity.Job.filter")).toHaveLength(0);
});

test("admin can mount the parts catalogue", async ({ page }) => {
  await openApp(page, "/dashboard/parts", "admin");

  await expect(page.getByRole("heading", { name: "Parts" })).toBeVisible();
  expect((await recordedEvents(page, "entity.Product.filter")).length).toBeGreaterThan(0);
});

test("admin can mount feedback management", async ({ page }) => {
  await openApp(page, "/admin/feedback", "admin");

  await expect(page.getByRole("heading", { name: "Feedback" })).toBeVisible();
  expect((await recordedEvents(page, "entity.Feedback.list")).length).toBeGreaterThan(0);
});

test("technician can mount customer management", async ({ page }) => {
  await openApp(page, "/admin/clients", "technician");

  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  expect((await recordedEvents(page, "function.customerActions")).length).toBeGreaterThan(0);
});
