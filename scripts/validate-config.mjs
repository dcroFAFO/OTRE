import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { INDEXABLE_STATIC_PATHS, ROUTE_ACCESS, ROUTE_MANIFEST } from "../src/config/routeManifest.js";

const root = process.cwd();
const failures = [];
const warnings = [];

async function files(directory, suffix) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(target, suffix));
    else if (entry.isFile() && target.endsWith(suffix)) output.push(target);
  }
  return output;
}

async function parseJsonc(file) {
  const text = await readFile(file, "utf8");
  const result = ts.parseConfigFileTextToJson(file, text);
  if (result.error) {
    failures.push(`${path.relative(root, file)} is not valid JSONC`);
    return null;
  }
  return result.config;
}

const entityFiles = await files(path.join(root, "base44", "entities"), ".jsonc");
const entityNames = new Set();
for (const file of entityFiles) {
  const entity = await parseJsonc(file);
  if (!entity) continue;
  if (!entity.name) failures.push(`${path.relative(root, file)} has no entity name`);
  if (entityNames.has(entity.name)) failures.push(`Duplicate entity name: ${entity.name}`);
  entityNames.add(entity.name);
  if (entity.name !== "User" && !entity.rls) failures.push(`${entity.name} has no RLS policy`);
}

const functionEntries = await files(path.join(root, "base44", "functions"), "entry.ts");
const functionNames = new Set(functionEntries.map((file) => path.basename(path.dirname(file))));
const sharedSources = await files(path.join(root, "base44", "shared"), ".ts");
const workflowFiles = await files(path.join(root, "base44", "workflows"), ".jsonc");
const frontendSources = [
  ...await files(path.join(root, "src"), ".js"),
  ...await files(path.join(root, "src"), ".jsx"),
];

const requiredBackendSdkVersion = "0.8.41";
const backendSdkMismatches = [];
for (const file of [...functionEntries, ...sharedSources]) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/npm:@base44\/sdk@([0-9.]+)/g)) {
    if (match[1] !== requiredBackendSdkVersion) {
      backendSdkMismatches.push(`${path.relative(root, file)} (${match[1]})`);
    }
  }
}
if (backendSdkMismatches.length) {
  failures.push(`Backend Base44 SDK pins must all be ${requiredBackendSdkVersion}: ${backendSdkMismatches.join(", ")}`);
}

const publicSiteConfigSource = await readFile(path.join(root, "base44", "functions", "publicSiteConfig", "entry.ts"), "utf8");
if (!/website_url:\s*safeHttpsUrl\(/.test(publicSiteConfigSource) || !/maps_url:\s*safeHttpsUrl\(/.test(publicSiteConfigSource)) {
  failures.push("publicSiteConfig must HTTPS-normalize public business URLs");
}
if (!/const href = safeNavigationHref\(link\.href\)/.test(publicSiteConfigSource)) {
  failures.push("publicSiteConfig must allowlist configured navigation URLs before publishing them");
}

const platformConfigSource = await readFile(path.join(root, "src", "config", "platformConfig.js"), "utf8");
const platformHookSource = await readFile(path.join(root, "src", "hooks", "usePlatformConfig.js"), "utf8");
const landingNavSource = await readFile(path.join(root, "src", "components", "landing", "LandingNav.jsx"), "utf8");
if (!/maps:\s*safeHttpsUrl\(business\.mapsUrl\)/.test(platformConfigSource)) failures.push("Business map links must use the public HTTPS URL allowlist");
if (!/safeNavigationHref\(link\.href\)/.test(platformHookSource)) failures.push("Platform configuration must normalize navigation links");
if (!/safeNavigationHref\(link\?\.href\)/.test(landingNavSource)) failures.push("LandingNav must revalidate configured links at the rendering boundary");

const ecwidSyncSource = await readFile(path.join(root, "base44", "functions", "syncEcwidProducts", "entry.ts"), "utf8");
if (!/sku:\s*\{\s*\$in:\s*skuKeys\s*\}/.test(ecwidSyncSource) || !/EXISTING_PRODUCT_QUERY_LIMIT/.test(ecwidSyncSource)) {
  failures.push("syncEcwidProducts must reconcile the current bounded SKU set with an explicit query limit");
}

const retiredFunctions = [
  "checkoutStatus",
  "createInvoiceCheckout",
  "createStoreCheckout",
  "stripeWebhook",
  "syncGoogleCalendarToJobs",
  "syncJobToGoogleCalendar",
  "seedPlatform",
  "assignCustomerIdToNewUser",
  "createCustomerForUser",
  "linkJobToCustomer",
];
const presentRetiredFunctions = retiredFunctions.filter((name) => functionNames.has(name));
if (presentRetiredFunctions.length) failures.push(`Retired functions are still deployable: ${presentRetiredFunctions.join(", ")}`);
if (functionNames.size > 50) failures.push(`Base44 supports at most 50 functions per app; found ${functionNames.size}.`);

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const stripePackages = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies }).filter((name) => name.startsWith("@stripe/") || name === "stripe");
if (stripePackages.length) failures.push(`Retired Stripe browser/server packages remain installed: ${stripePackages.join(", ")}`);

const publicUploadSources = [];
const deprecatedCustomerFlagSources = [];
const mutableRoleSources = [];
const retiredIntegrationSources = [];
for (const file of [...frontendSources, ...functionEntries, ...sharedSources]) {
  const source = await readFile(file, "utf8");
  const relative = path.relative(root, file);
  if (/\.UploadFile\s*\(/.test(source) || /\bfile_url\b/.test(source)) publicUploadSources.push(relative);
  if (/[{,]\s*is_customer\s*:/.test(source)) deprecatedCustomerFlagSources.push(relative);
  if (/\buser\?*\.data\?*\.is_customer\b|\buser\.data\.is_customer\b/.test(source)) mutableRoleSources.push(relative);
  if (/contentful|syncGoogleCalendarToJobs|syncJobToGoogleCalendar/i.test(source)) retiredIntegrationSources.push(relative);
}
if (publicUploadSources.length) failures.push(`Public file upload/permanent URL code remains: ${publicUploadSources.join(", ")}`);
if (deprecatedCustomerFlagSources.length) failures.push(`Deprecated is_customer writes remain: ${deprecatedCustomerFlagSources.join(", ")}`);
if (mutableRoleSources.length) failures.push(`Mutable is_customer is still used by backend authorization: ${mutableRoleSources.join(", ")}`);
if (retiredIntegrationSources.length) failures.push(`Retired Contentful/Google Calendar runtime references remain: ${retiredIntegrationSources.join(", ")}`);

const portalSources = frontendSources.filter((file) => /[\\/]src[\\/](?:pages[\\/]Portal|components[\\/]portal|services[\\/]customerPortal)/.test(file));
const directPortalReads = [];
for (const file of portalSources) {
  const source = await readFile(file, "utf8");
  if (/base44\.entities\.(?:Attachment|AuditEvent|Customer|CustomerNote|Invoice|Job|JobNote|Scooter)\b/.test(source)) {
    directPortalReads.push(path.relative(root, file));
  }
}
if (directPortalReads.length) failures.push(`Customer portal directly reads admin-only entities: ${directPortalReads.join(", ")}`);
for (const file of workflowFiles) {
  const workflow = await parseJsonc(file);
  if (!workflow) continue;
  if ((workflow.definition?.do || []).some((step) => step.placeholder)) {
    failures.push(`${path.relative(root, file)} is a scheduled placeholder workflow`);
  }
  const referenced = [...JSON.stringify(workflow).matchAll(/"function_name":"([^"]+)"/g)].map((match) => match[1]);
  for (const name of referenced) if (!functionNames.has(name)) failures.push(`${path.relative(root, file)} references missing function ${name}`);
}

const legacyRoleEntities = [];
for (const file of entityFiles) {
  const entity = await parseJsonc(file);
  if (entity?.rls && /"role":"(?:employee|technician|staff)"/.test(JSON.stringify(entity.rls))) {
    legacyRoleEntities.push(entity.name || path.basename(file));
  }
}
if (legacyRoleEntities.length) failures.push(`Entity RLS still grants retired roles: ${legacyRoleEntities.sort().join(", ")}`);

for (const file of await files(path.join(root, "base44", "agents"), ".jsonc")) {
  const agent = await parseJsonc(file);
  for (const tool of agent?.tool_configs || []) {
    if (tool.entity_name && !entityNames.has(tool.entity_name)) failures.push(`${path.relative(root, file)} references missing entity ${tool.entity_name}`);
  }
}

const ids = ROUTE_MANIFEST.map((route) => route.id);
const paths = ROUTE_MANIFEST.map((route) => route.path);
if (new Set(ids).size !== ids.length) failures.push("Route ids must be unique");
if (new Set(paths).size !== paths.length) failures.push("Route paths must be unique");
if (ROUTE_MANIFEST.some((route) => route.indexable && route.access !== ROUTE_ACCESS.PUBLIC)) failures.push("Private routes cannot be indexable");

const sitemapConfig = await readFile(path.join(root, "base44", "shared", "sitemapConfig.ts"), "utf8");
const sitemapPaths = [...sitemapConfig.matchAll(/\{ path: "([^"]+)", changefreq:/g)].map((match) => match[1]).sort();
if (JSON.stringify(sitemapPaths) !== JSON.stringify([...INDEXABLE_STATIC_PATHS].sort())) {
  failures.push(`Static sitemap paths differ from indexable routes (${sitemapPaths.join(", ")})`);
}

const sitemapIndex = await readFile(path.join(root, "public", "sitemap.xml"), "utf8");
if (/sitemap(?:Portal|Staff)/.test(sitemapIndex)) failures.push("Public sitemap index exposes private route sitemaps");
const robots = await readFile(path.join(root, "public", "robots.txt"), "utf8");
const disallowedPaths = [...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gm)].map((match) => match[1]);
for (const route of ROUTE_MANIFEST.filter((entry) => !entry.indexable && entry.path !== "/book")) {
  const covered = disallowedPaths.some((rule) => route.path === rule || route.path.startsWith(rule.endsWith("/") ? rule : `${rule}/`));
  if (!covered) failures.push(`robots.txt does not cover non-indexable route ${route.path}`);
}
const html = await readFile(path.join(root, "index.html"), "utf8");
if (/googletagmanager|gtag\(|AW-\d+/.test(html)) failures.push("index.html contains hard-coded analytics or advertising tags");
if (/rel=["']manifest["']/.test(html)) failures.push("index.html still enables the retired PWA manifest");
const termsSource = await readFile(path.join(root, "src", "pages", "Terms.jsx"), "utf8");
if (!/googletagmanager|gtag\(|AW-\d+/.test(html) && /We use(?:\s|<[^>]+>){0,20}Google (?:Analytics|Ads)/i.test(termsSource)) {
  failures.push("Terms claims Google Analytics/Ads are active while static tracking is disabled");
}

const base44Config = await parseJsonc(path.join(root, "base44", "config.jsonc"));
if (!base44Config?.name || base44Config.name === "untitled") failures.push("base44/config.jsonc must have a production-safe app name");
if (base44Config?.site?.installCommand !== "npm ci") failures.push("Base44 installCommand must use npm ci");

const viteConfig = await readFile(path.join(root, "vite.config.js"), "utf8");
if (!/preview:[\s\S]*proxy:[\s\S]*["']\/api["']/.test(viteConfig)) failures.push("Vite preview must proxy /api for production-build E2E tests");
const stagingWorkflow = await readFile(path.join(root, ".github", "workflows", "staging-e2e.yml"), "utf8");
if (!stagingWorkflow.includes("npm run validate:staging-env")) failures.push("Staging E2E must validate environment isolation before browser tests");
if (!stagingWorkflow.includes("PLAYWRIGHT_BASE_URL")) failures.push("Staging E2E must target an explicit deployed staging site URL");

const environmentManifest = JSON.parse(await readFile(path.join(root, "ops", "environment-manifest.json"), "utf8"));
const declaredBackendSecrets = new Set(environmentManifest.requiredBackendSecrets || []);
for (const file of [...functionEntries, ...sharedSources]) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/Deno\.env\.get\(["']([^"']+)["']\)/g)) {
    if (!declaredBackendSecrets.has(match[1])) failures.push(`Backend environment variable ${match[1]} is absent from ops/environment-manifest.json`);
  }
}

let localImportCount = 0;
for (const file of functionEntries) {
  const source = await readFile(file, "utf8");
  localImportCount += [...source.matchAll(/from\s+["']\.\.\/\.\.\//g)].length;
}
if (localImportCount) warnings.push(`${localImportCount} backend local imports require Base44 deployment compatibility verification`);

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`ERROR: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Static configuration valid: ${entityNames.size} entities, ${functionNames.size} functions, ${workflowFiles.length} workflows, ${ROUTE_MANIFEST.length} routes.`);
}
