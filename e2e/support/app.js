import { expect } from "@playwright/test";

export async function prepareApp(page, role = "guest") {
  await page.addInitScript((nextRole) => {
    localStorage.setItem("otre:e2e:role", nextRole);
    if (!localStorage.getItem("otre:e2e:events")) {
      localStorage.setItem("otre:e2e:events", "[]");
    }
    if (nextRole === "guest") localStorage.removeItem("base44_access_token");
    else localStorage.setItem("base44_access_token", "e2e-token");
  }, role);

  await page.route("**/api/apps/public/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ id: "otre-e2e", public_settings: { auth_required: false } }),
  }));
}

export async function openApp(page, path, role = "guest") {
  await prepareApp(page, role);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => Boolean(window.__OTRE_E2E__))).toBe(true);
}

export async function recordedEvents(page, type) {
  return page.evaluate((eventType) => {
    const events = JSON.parse(localStorage.getItem("otre:e2e:events") || "[]");
    return eventType ? events.filter((event) => event.type === eventType) : events;
  }, type);
}

export async function expectEvent(page, type) {
  await expect.poll(async () => (await recordedEvents(page, type)).length).toBeGreaterThan(0);
  const events = await recordedEvents(page, type);
  return events.at(-1);
}
