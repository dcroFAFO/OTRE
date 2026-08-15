import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json"]);

async function textFiles(directory, output = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await textFiles(target, output);
    else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) output.push(target);
  }
  return output;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function validateReleaseArtifact({ distDir, expectedAppId, forbiddenAppIds = [] }) {
  const errors = [];
  const marker = new RegExp(`VITE_BASE44_APP_ID["']?\\s*:\\s*["']${escapeRegExp(expectedAppId)}["']`);
  const forbiddenMarkers = forbiddenAppIds
    .filter((appId) => appId && appId !== expectedAppId)
    .map((appId) => ({ appId, pattern: new RegExp(`VITE_BASE44_APP_ID["']?\\s*:\\s*["']${escapeRegExp(appId)}["']`) }));
  let foundExpected = false;

  for (const file of await textFiles(distDir)) {
    if (path.basename(file) === "release-manifest.json") continue;
    const text = await readFile(file, "utf8");
    if (marker.test(text)) foundExpected = true;
    for (const candidate of forbiddenMarkers) {
      if (candidate.pattern.test(text)) errors.push(`${path.relative(distDir, file)} embeds the forbidden ${candidate.appId} runtime app binding.`);
    }
  }

  if (!foundExpected) errors.push(`No frontend artifact embeds the expected ${expectedAppId} runtime app binding.`);
  return errors;
}
