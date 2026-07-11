import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const scripts = packageJson.scripts || {};
const checks = ["lint", "typecheck", "test", "build"];
const summaryOnly = process.env.CHECK_SUMMARY_ONLY === "1";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

let failed = false;

for (const check of checks) {
  if (!scripts[check]) {
    failed = true;
    console.error(`[check] FAIL ${check}: package.json has no ${check} script`);
    continue;
  }

  console.log(`[check] RUN  ${check}`);
  const result = spawnSync(npmCommand, ["run", check], {
    cwd: new URL("..", import.meta.url),
    encoding: summaryOnly ? "utf8" : undefined,
    env: process.env,
    stdio: summaryOnly ? "pipe" : "inherit",
  });

  if (result.error) {
    failed = true;
    console.error(`[check] FAIL ${check}: ${result.error.message}`);
    continue;
  }

  if (result.status !== 0) {
    failed = true;
    const detail = result.signal ? `signal ${result.signal}` : `exit ${result.status}`;
    console.error(`[check] FAIL ${check}: ${detail}`);
    continue;
  }

  console.log(`[check] PASS ${check}`);
}

if (failed) {
  console.error("[check] RESULT failed");
  process.exitCode = 1;
} else {
  console.log("[check] RESULT passed");
}
