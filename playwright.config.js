import { defineConfig } from "@playwright/test";

const executablePath = process.env.OTRE_PLAYWRIGHT_EXECUTABLE_PATH;
if (!executablePath) {
  throw new Error("Run Playwright through npm run test:e2e so its Chromium executable is prepared.");
}

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  timeout: 90_000,
  use: {
    baseURL: "http://127.0.0.1:4174",
    headless: true,
    launchOptions: {
      executablePath,
      args: [
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-setuid-sandbox",
        "--no-sandbox",
      ],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4174",
    env: {
      OTRE_E2E: "1",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:4174",
  },
});
