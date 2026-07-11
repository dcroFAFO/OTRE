import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateDiagnosticBudget } from "./lib/diagnostic-budget.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const baseline = JSON.parse(readFileSync(join(root, "config/quality-baseline.json"), "utf8"));
const maxBuffer = 64 * 1024 * 1024;
const childEnv = { ...process.env, NO_COLOR: "1" };
delete childEnv.FORCE_COLOR;

function runNodeTool(label, executable, args, expectedStatuses) {
  const result = spawnSync(process.execPath, [executable, ...args], {
    cwd: root,
    encoding: "utf8",
    env: childEnv,
    maxBuffer,
  });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (!expectedStatuses.includes(result.status)) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${label} failed with exit ${result.status}${detail ? `\n${detail}` : ""}`);
  }
  return result;
}

function increment(counts, category) {
  counts[category] = (counts[category] || 0) + 1;
}

function lintDiagnostics() {
  const eslint = runNodeTool(
    "ESLint",
    join(root, "node_modules/eslint/bin/eslint.js"),
    [".", "--format", "json", "--max-warnings", "0"],
    [0, 1],
  );
  let results;
  try {
    results = JSON.parse(eslint.stdout || "[]");
  } catch (error) {
    throw new Error(`ESLint returned invalid JSON: ${error.message}`);
  }

  const counts = {};
  for (const file of results) {
    for (const message of file.messages || []) {
      if (message.severity < 1) continue;
      const rule = message.ruleId || `fatal:${relative(root, file.filePath)}`;
      increment(counts, message.severity === 1 ? `warning:${rule}` : rule);
    }
  }
  return counts;
}

function typecheckDiagnostics() {
  const tsc = runNodeTool(
    "TypeScript",
    join(root, "node_modules/typescript/bin/tsc"),
    ["-p", "./jsconfig.json", "--pretty", "false"],
    [0, 2],
  );
  const output = `${tsc.stdout || ""}\n${tsc.stderr || ""}`;
  const counts = {};
  for (const match of output.matchAll(/error (TS\d+):/g)) increment(counts, match[1]);
  if (tsc.status !== 0 && Object.keys(counts).length === 0) {
    throw new Error(`TypeScript exited ${tsc.status} without parseable diagnostics\n${output.trim()}`);
  }
  return counts;
}

function report(label, current, budget) {
  const result = evaluateDiagnosticBudget(current, budget);
  if (result.ok) {
    const reduction = result.maxTotal - result.currentTotal;
    console.log(`[diagnostics] PASS ${label}: ${result.currentTotal}/${result.maxTotal}${reduction ? ` (${reduction} removed)` : ""}`);
    return true;
  }
  console.error(`[diagnostics] FAIL ${label}: ${result.currentTotal}/${result.maxTotal}`);
  for (const issue of result.issues) console.error(`[diagnostics]   ${issue}`);
  return false;
}

try {
  const lint = lintDiagnostics();
  const typecheck = typecheckDiagnostics();
  const passed = [
    report("lint", lint, baseline.lint),
    report("typecheck", typecheck, baseline.typecheck),
  ].every(Boolean);
  if (!passed) process.exitCode = 1;
} catch (error) {
  console.error(`[diagnostics] ERROR ${error.message}`);
  process.exitCode = 1;
}
