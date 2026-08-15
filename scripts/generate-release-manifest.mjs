import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

async function collect(directory, suffixes, result = {}) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(target, suffixes, result);
    else if (entry.isFile() && suffixes.some((suffix) => entry.name.endsWith(suffix))) {
      const relative = path.relative(root, target).replaceAll("\\", "/");
      const content = await readFile(target);
      result[relative] = createHash("sha256").update(content).digest("hex");
    }
  }
  return result;
}

const appConfigText = await readFile(path.join(root, "base44", ".app.jsonc"), "utf8");
const parsedAppConfig = ts.parseConfigFileTextToJson("base44/.app.jsonc", appConfigText);
if (parsedAppConfig.error || !parsedAppConfig.config?.id) throw new Error("base44/.app.jsonc has no valid app id.");
const sourceBindingAppId = parsedAppConfig.config.id;
const targetAppId = process.env.VITE_BASE44_APP_ID || sourceBindingAppId;
const lock = await readFile(path.join(root, "package-lock.json"));
const commit = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const workingTreeDirty = Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim());
const frontendFiles = await collect(path.join(root, "dist"), [".html", ".css", ".js", ".json"]);
delete frontendFiles["dist/release-manifest.json"];
const frontendArtifactSha256 = createHash("sha256")
  .update(JSON.stringify(Object.fromEntries(Object.entries(frontendFiles).sort(([a], [b]) => a.localeCompare(b)))))
  .digest("hex");
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  commit,
  workingTreeDirty,
  appId: targetAppId,
  sourceBindingAppId,
  releaseId: process.env.VITE_RELEASE_ID || commit,
  node: process.version,
  packageLockSha256: createHash("sha256").update(lock).digest("hex"),
  frontendArtifactSha256,
  buildTarget: {
    appBaseUrl: process.env.VITE_BASE44_APP_BASE_URL || null,
    functionsVersion: process.env.VITE_BASE44_FUNCTIONS_VERSION || null,
    publicSiteUrl: process.env.VITE_PUBLIC_SITE_URL || null,
  },
  base44: {
    entities: await collect(path.join(root, "base44", "entities"), [".jsonc"]),
    functionsAndShared: {
      ...await collect(path.join(root, "base44", "functions"), [".ts"]),
      ...await collect(path.join(root, "base44", "shared"), [".ts"]),
    },
    workflows: await collect(path.join(root, "base44", "workflows"), [".jsonc"]),
    agents: await collect(path.join(root, "base44", "agents"), [".jsonc"]),
    connectors: await collect(path.join(root, "base44", "connectors"), [".jsonc"]),
  },
  requiredBuildVariables: [
    "VITE_BASE44_APP_ID",
    "VITE_BASE44_APP_BASE_URL",
    "VITE_PUBLIC_SITE_URL",
    "VITE_RELEASE_ID"
  ]
};

await mkdir(path.join(root, "dist"), { recursive: true });
await writeFile(path.join(root, "dist", "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Release manifest written for ${commit}.`);
if (workingTreeDirty) console.warn("WARNING: working tree is dirty; this manifest is validation evidence, not a deployable release record.");
