import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

export const RELEASE_TARGETS = Object.freeze(["staging", "production"]);
export const REQUIRED_BUILD_VARIABLES = Object.freeze([
  "VITE_BASE44_APP_ID",
  "VITE_BASE44_APP_BASE_URL",
  "VITE_PUBLIC_SITE_URL",
  "VITE_RELEASE_ID",
]);
export const REQUIRED_PRODUCTION_GATES = Object.freeze([
  "PRIVATE_UPLOAD_PROVENANCE_VERIFIED",
  "PROXY_HEADER_TRUST_VERIFIED",
  "AUTH_PROVIDER_MATRIX_VERIFIED",
  "DATABASE_RESTORE_TESTED",
  "AUTOMATION_OWNER_VERIFIED",
  "CSP_DECISION_RECORDED",
  "BASE44_CREDITS_READY",
]);

function requiredText(value, label, errors) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) errors.push(`${label} is required.`);
  return normalized;
}

function httpsOrigin(value, label, errors) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error("not HTTPS");
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new Error("not an origin");
    }
    return parsed.origin;
  } catch {
    errors.push(`${label} must be a credential-free HTTPS origin.`);
    return "";
  }
}

export async function loadReleaseConfiguration(root = process.cwd()) {
  const environmentManifest = JSON.parse(
    await readFile(path.join(root, "ops", "environment-manifest.json"), "utf8"),
  );
  const platformReadiness = JSON.parse(
    await readFile(path.join(root, "ops", "platform-readiness.json"), "utf8"),
  );
  const sourceText = await readFile(path.join(root, "base44", ".app.jsonc"), "utf8");
  const parsed = ts.parseConfigFileTextToJson("base44/.app.jsonc", sourceText);
  if (parsed.error || !parsed.config?.id) throw new Error("base44/.app.jsonc has no valid app id.");
  return { environmentManifest, platformReadiness, sourceBindingAppId: parsed.config.id };
}

export function validatePlatformReadiness(platformReadiness, { productionAppId } = {}) {
  const errors = [];
  if (platformReadiness?.schemaVersion !== 1) errors.push("ops/platform-readiness.json schemaVersion must be 1.");
  if (productionAppId && platformReadiness?.appId !== productionAppId) {
    errors.push("Platform-readiness evidence is not bound to the production app id.");
  }

  for (const gateName of REQUIRED_PRODUCTION_GATES) {
    const gate = platformReadiness?.gates?.[gateName];
    if (gate?.status !== "verified") {
      errors.push(`${gateName} is not verified.`);
      continue;
    }
    if (typeof gate.owner !== "string" || !gate.owner.trim()) errors.push(`${gateName} has no accountable owner.`);
    if (!Array.isArray(gate.evidence) || gate.evidence.length === 0 || gate.evidence.some((item) => typeof item !== "string" || !item.trim())) {
      errors.push(`${gateName} has no auditable evidence reference.`);
    }
    if (!gate.verifiedAt || Number.isNaN(Date.parse(gate.verifiedAt))) errors.push(`${gateName} has no valid verifiedAt timestamp.`);
  }

  const controls = platformReadiness?.serverControls || {};
  if (controls.PRIVATE_UPLOADS_ENABLED === true
    && platformReadiness?.gates?.PRIVATE_UPLOAD_PROVENANCE_VERIFIED?.status !== "verified") {
    errors.push("PRIVATE_UPLOADS_ENABLED cannot be true before private upload provenance is verified.");
  }
  if (controls.TRUST_PROXY_HEADERS === true
    && platformReadiness?.gates?.PROXY_HEADER_TRUST_VERIFIED?.status !== "verified") {
    errors.push("TRUST_PROXY_HEADERS cannot be true before proxy header trust is verified.");
  }
  if (controls.AUTOMATIONS_ENABLED === true
    && platformReadiness?.gates?.AUTOMATION_OWNER_VERIFIED?.status !== "verified") {
    errors.push("AUTOMATIONS_ENABLED cannot be true before the automation owner is verified.");
  }
  return errors;
}

export function validateReleaseEnvironment({
  target,
  env = process.env,
  environmentManifest,
  platformReadiness,
  sourceBindingAppId,
  requireBrowserTarget = false,
  requireProductionReadiness = target === "production",
}) {
  const errors = [];
  if (!RELEASE_TARGETS.includes(target)) {
    return { errors: [`RELEASE_TARGET must be one of: ${RELEASE_TARGETS.join(", ")}.`] };
  }

  const targetConfig = environmentManifest?.environments?.[target];
  if (!targetConfig?.appId || !targetConfig?.appBaseUrl || !targetConfig?.siteUrl || !targetConfig?.publicSiteUrl) {
    errors.push(`ops/environment-manifest.json has incomplete ${target} release coordinates.`);
    return { errors };
  }

  const appId = requiredText(env.VITE_BASE44_APP_ID, "VITE_BASE44_APP_ID", errors);
  const appBaseUrl = httpsOrigin(requiredText(env.VITE_BASE44_APP_BASE_URL, "VITE_BASE44_APP_BASE_URL", errors), "VITE_BASE44_APP_BASE_URL", errors);
  const publicSiteUrl = httpsOrigin(requiredText(env.VITE_PUBLIC_SITE_URL, "VITE_PUBLIC_SITE_URL", errors), "VITE_PUBLIC_SITE_URL", errors);
  const releaseId = requiredText(env.VITE_RELEASE_ID, "VITE_RELEASE_ID", errors);

  if (appId && appId !== targetConfig.appId) errors.push(`VITE_BASE44_APP_ID does not match the declared ${target} app id.`);
  if (appBaseUrl && appBaseUrl !== new URL(targetConfig.appBaseUrl).origin) errors.push(`VITE_BASE44_APP_BASE_URL does not match the declared ${target} origin.`);
  if (publicSiteUrl && publicSiteUrl !== new URL(targetConfig.publicSiteUrl).origin) errors.push(`VITE_PUBLIC_SITE_URL does not match the declared ${target} public origin.`);
  if (releaseId === "local" || releaseId === "development") errors.push("VITE_RELEASE_ID must be an immutable release identifier.");

  if (target === "production") {
    if (sourceBindingAppId !== targetConfig.appId) errors.push("The checked-in Base44 binding does not match the declared production app id.");
    if (requireProductionReadiness) errors.push(...validatePlatformReadiness(platformReadiness, { productionAppId: targetConfig.appId }));
  } else if (appId && appId === sourceBindingAppId) {
    errors.push("Staging must not use the checked-in production Base44 app id.");
  }

  let browserTarget = "";
  if (requireBrowserTarget) {
    browserTarget = httpsOrigin(requiredText(env.PLAYWRIGHT_BASE_URL, "PLAYWRIGHT_BASE_URL", errors), "PLAYWRIGHT_BASE_URL", errors);
    if (browserTarget && browserTarget !== new URL(targetConfig.siteUrl).origin) {
      errors.push(`PLAYWRIGHT_BASE_URL does not match the declared ${target} deployed site.`);
    }
  }

  return {
    errors,
    normalized: { target, appId, appBaseUrl, publicSiteUrl, releaseId, browserTarget },
    targetConfig,
  };
}

export function throwForErrors(errors, heading = "Release environment validation failed") {
  if (!errors.length) return;
  throw new Error(`${heading}:\n- ${errors.join("\n- ")}`);
}
