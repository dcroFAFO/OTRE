import { loadReleaseConfiguration, throwForErrors, validateReleaseEnvironment } from "./lib/release-environment.mjs";

export async function validateTarget(target, { requireBrowserTarget = target === "staging" } = {}) {
  const configuration = await loadReleaseConfiguration();
  const result = validateReleaseEnvironment({
    target,
    env: process.env,
    ...configuration,
    requireBrowserTarget,
  });
  throwForErrors(result.errors, `${target} environment validation failed`);
  console.log(`${target[0].toUpperCase()}${target.slice(1)} environment matches the audited release coordinates.`);
  return result;
}
