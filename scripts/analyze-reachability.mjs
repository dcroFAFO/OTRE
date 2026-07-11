import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(root, "src");
const moduleExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function repositoryPath(path) {
  return relative(root, path).split(sep).join("/");
}

function isApplicationModule(path) {
  const repoPath = repositoryPath(path);
  if (!moduleExtensions.has(extname(path))) return false;
  if (/\.(test|spec)\.(js|jsx|ts|tsx)$/.test(repoPath)) return false;
  if (repoPath.startsWith("src/test/")) return false;
  if (repoPath.endsWith(".d.ts")) return false;
  return true;
}

const bundle = await build({
  absWorkingDir: root,
  alias: { "@": sourceRoot },
  bundle: true,
  entryPoints: ["src/main.jsx"],
  entryNames: "[name]",
  format: "esm",
  loader: {
    ".css": "empty",
    ".gif": "file",
    ".jpeg": "file",
    ".jpg": "file",
    ".png": "file",
    ".svg": "file",
    ".webp": "file",
  },
  logLevel: "silent",
  metafile: true,
  outdir: join(tmpdir(), "otre-reachability"),
  packages: "external",
  platform: "browser",
  write: false,
});

const allModules = walk(sourceRoot).filter(isApplicationModule).map(repositoryPath).sort();
const reachable = new Set(
  Object.keys(bundle.metafile.inputs)
    .filter((path) => path.startsWith("src/"))
    .map((path) => path.split(sep).join("/")),
);
const unreachable = allModules.filter((path) => !reachable.has(path));
const report = {
  entry: "src/main.jsx",
  modules: allModules.length,
  reachable: allModules.length - unreachable.length,
  unreachable,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`[reachability] entry: ${report.entry}`);
  console.log(`[reachability] modules: ${report.modules}`);
  console.log(`[reachability] reachable: ${report.reachable}`);
  console.log(`[reachability] unreachable: ${report.unreachable.length}`);
  for (const path of report.unreachable) console.log(path);
}

if (process.argv.includes("--fail-on-unreachable") && report.unreachable.length > 0) {
  console.error("[reachability] FAIL application modules must be reachable or explicitly removed");
  process.exitCode = 1;
}
