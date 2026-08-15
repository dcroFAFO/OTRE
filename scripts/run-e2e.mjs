import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const isolation = spawnSync(npm, ["run", "validate:staging-env"], { stdio: "inherit" });
if (isolation.status !== 0) process.exit(isolation.status ?? 1);
const build = spawnSync(npm, ["run", "build"], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);
const tests = spawnSync(npm, ["run", "test:e2e"], { stdio: "inherit" });
process.exit(tests.status ?? 1);
