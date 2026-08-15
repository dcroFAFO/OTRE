import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const budgets = JSON.parse(await readFile(path.join(root, "ops", "bundle-budgets.json"), "utf8"));
const manifestPath = path.join(root, "dist", ".vite", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const assetDir = path.join(root, "dist", "assets");
const jsFiles = (await readdir(assetDir)).filter((name) => name.endsWith(".js"));
const sizes = new Map();

for (const file of jsFiles) {
  const bytes = await readFile(path.join(assetDir, file));
  sizes.set(`assets/${file}`, gzipSync(bytes).byteLength);
}

const entryFiles = new Set(
  Object.values(manifest).filter((item) => item.isEntry).map((item) => item.file),
);
const failures = [];
for (const [file, gzipBytes] of sizes) {
  const limit = entryFiles.has(file) ? budgets.entryGzipBytes : budgets.chunkGzipBytes;
  if (gzipBytes > limit) failures.push(`${file}: ${gzipBytes} gzip bytes exceeds ${limit}`);
}
const total = [...sizes.values()].reduce((sum, value) => sum + value, 0);
if (total > budgets.totalJavaScriptGzipBytes) {
  failures.push(`total JavaScript: ${total} gzip bytes exceeds ${budgets.totalJavaScriptGzipBytes}`);
}

console.log(`Bundle budget: ${sizes.size} JavaScript chunks, ${total} total gzip bytes.`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
