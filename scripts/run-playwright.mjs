import { spawnSync } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createBrotliDecompress } from "node:zlib";

const runtimeDirectory = join(tmpdir(), "otre-playwright-chromium-149");
mkdirSync(runtimeDirectory, { recursive: true });
process.env.TMPDIR = runtimeDirectory;
process.env.HOME = runtimeDirectory;
process.env.XDG_CACHE_HOME = join(runtimeDirectory, "cache");
process.env.FONTCONFIG_PATH = join(runtimeDirectory, "fonts");
mkdirSync(process.env.XDG_CACHE_HOME, { recursive: true });
mkdirSync(process.env.FONTCONFIG_PATH, { recursive: true });

const chromiumBinDirectory = fileURLToPath(
  new URL("../node_modules/@sparticuz/chromium/bin/", import.meta.url),
);

async function extractTarBrotli(archiveName, markerPath, destination) {
  if (existsSync(markerPath)) return;
  const tarPath = join(runtimeDirectory, `${archiveName}.tar`);
  await pipeline(
    createReadStream(join(chromiumBinDirectory, `${archiveName}.tar.br`)),
    createBrotliDecompress(),
    createWriteStream(tarPath),
  );
  const extraction = spawnSync("tar", ["--extract", "--file", tarPath, "--directory", destination, "--no-same-owner"], {
    encoding: "utf8",
  });
  unlinkSync(tarPath);
  if (extraction.error) throw extraction.error;
  if (extraction.status !== 0) {
    throw new Error(`Could not extract ${archiveName}: ${extraction.stderr || `exit ${extraction.status}`}`);
  }
}

const executablePath = join(runtimeDirectory, "chromium");
if (existsSync(executablePath) && statSync(executablePath).size === 0) {
  unlinkSync(executablePath);
}

if (!existsSync(executablePath)) {
  const { inflate } = await import("@sparticuz/chromium");
  const archivePath = join(chromiumBinDirectory, "chromium.br");
  await inflate(archivePath);
}

if (!existsSync(executablePath) || statSync(executablePath).size === 0) {
  throw new Error("The Playwright Chromium executable could not be prepared.");
}

await extractTarBrotli("swiftshader", join(runtimeDirectory, "libGLESv2.so"), runtimeDirectory);
await extractTarBrotli("fonts", join(process.env.FONTCONFIG_PATH, "fonts.conf"), process.env.FONTCONFIG_PATH);
writeFileSync(
  join(process.env.FONTCONFIG_PATH, "fonts.conf"),
  [
    '<?xml version="1.0"?>',
    '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">',
    "<fontconfig>",
    `  <dir>${join(process.env.FONTCONFIG_PATH, "fonts")}</dir>`,
    `  <cachedir>${join(process.env.XDG_CACHE_HOME, "fontconfig")}</cachedir>`,
    "</fontconfig>",
    "",
  ].join("\n"),
);

const cliPath = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
const result = spawnSync(process.execPath, [cliPath, "test", ...process.argv.slice(2)], {
  cwd: dirname(fileURLToPath(new URL("../package.json", import.meta.url))),
  env: {
    ...process.env,
    OTRE_E2E: "1",
    OTRE_PLAYWRIGHT_EXECUTABLE_PATH: executablePath,
  },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
