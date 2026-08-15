import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sources = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(target);
    else if (entry.isFile() && target.endsWith(".ts")) sources.push(path.relative(root, target));
  }
}

await collect(path.join(root, "base44", "functions"));
await collect(path.join(root, "base44", "shared"));
if (!sources.length) throw new Error("No Base44 backend TypeScript sources were found.");

const deno = process.platform === "win32" ? "deno.exe" : "deno";
const env = {
  ...process.env,
  DENO_DIR: path.join(root, ".cache", "deno"),
  DENO_NO_UPDATE_CHECK: "1",
};

function runDeno(args) {
  const result = spawnSync(deno, args, { cwd: root, env, stdio: "inherit" });
  if (result.error?.code === "ENOENT") {
    console.error("Deno is required. Install Deno 2.x before running backend validation.");
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Base44 backend lint: ${sources.length} files`);
runDeno(["lint", "--config", "deno.json", ...sources]);

console.log(`Base44 backend typecheck: ${sources.length} files`);
if (process.platform === "win32") {
  // Deno's npm cache can race while resolving several independent roots on Windows.
  // Checking roots serially keeps the local release gate deterministic; Linux CI
  // retains the faster whole-program invocation below.
  for (const source of sources) runDeno(["check", "--config", "deno.json", source]);
} else {
  runDeno(["check", "--config", "deno.json", ...sources]);
}
