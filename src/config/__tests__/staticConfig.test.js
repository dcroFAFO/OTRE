import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("static configuration validator", () => {
  it("accepts the checked-in routes, schemas, workflows, sitemap, and HTML policy", () => {
    const result = spawnSync(process.execPath, ["scripts/validate-config.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Static configuration valid:");
  }, 20_000);

  it("accepts only a separately bound HTTPS staging environment", () => {
    const result = spawnSync(process.execPath, ["scripts/validate-staging-env.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        VITE_BASE44_APP_ID: "isolated-staging-app",
        VITE_BASE44_APP_BASE_URL: "https://staging.example.invalid",
        PLAYWRIGHT_BASE_URL: "https://staging-site.example.invalid",
      },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Staging environment is isolated");
  });

  it("rejects a staging proxy pointed at the production domain", () => {
    const result = spawnSync(process.execPath, ["scripts/validate-staging-env.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        VITE_BASE44_APP_ID: "isolated-staging-app",
        VITE_BASE44_APP_BASE_URL: "https://ontherunelectrics.com.au",
        PLAYWRIGHT_BASE_URL: "https://staging-site.example.invalid",
      },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("must not proxy API traffic to the production site");
  });

  it("rejects browser verification pointed at the production site", () => {
    const result = spawnSync(process.execPath, ["scripts/validate-staging-env.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        VITE_BASE44_APP_ID: "isolated-staging-app",
        VITE_BASE44_APP_BASE_URL: "https://staging.example.invalid",
        PLAYWRIGHT_BASE_URL: "https://ontherunelectrics.com.au",
      },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Browser verification must not target the production site");
  });
});
