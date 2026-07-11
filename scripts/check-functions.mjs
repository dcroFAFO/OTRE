import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const functionsRoot = join(root, "base44/functions");
const childEnv = { ...process.env, NO_COLOR: "1" };
delete childEnv.FORCE_COLOR;

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const functionDirectories = readdirSync(functionsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "_shared")
  .map((entry) => entry.name)
  .sort();
const allTypeScript = walk(functionsRoot).filter((path) => path.endsWith(".ts"));
const entryPoints = functionDirectories.map((name) => join(functionsRoot, name, "entry.ts"));
const entrySet = new Set(allTypeScript.filter((path) => path.endsWith("/entry.ts")));
const missingEntries = entryPoints.filter((path) => !entrySet.has(path));
if (missingEntries.length > 0) {
  for (const path of missingEntries) console.error(`[functions] missing entry: ${path}`);
  process.exit(1);
}

const supportModules = allTypeScript.filter((path) => !path.endsWith("/entry.ts"));
if (supportModules.length > 0) {
  const typecheck = spawnSync(process.execPath, [
    join(root, "node_modules/typescript/bin/tsc"),
    "--noEmit",
    "--target", "ES2022",
    "--module", "ESNext",
    "--moduleResolution", "Bundler",
    "--allowImportingTsExtensions",
    ...supportModules,
  ], {
    cwd: root,
    encoding: "utf8",
    env: childEnv,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (typecheck.error) throw typecheck.error;
  if (typecheck.status !== 0) {
    console.error([typecheck.stdout, typecheck.stderr].filter(Boolean).join("\n"));
    process.exit(typecheck.status ?? 1);
  }
}

try {
  const result = await build({
    absWorkingDir: root,
    bundle: true,
    entryNames: "[dir]/[name]",
    entryPoints,
    external: ["npm:*"],
    format: "esm",
    logLevel: "silent",
    outbase: functionsRoot,
    outdir: join(tmpdir(), "otre-function-check"),
    platform: "neutral",
    write: false,
  });
  if (result.outputFiles.length !== entryPoints.length) {
    throw new Error(`expected ${entryPoints.length} bundles, received ${result.outputFiles.length}`);
  }
  console.log(`[functions] PASS typecheck: ${supportModules.length} support modules`);
  console.log(`[functions] PASS bundle: ${entryPoints.length} function entries`);
} catch (error) {
  console.error(`[functions] FAIL ${error.message}`);
  process.exitCode = 1;
}
