import { validateTarget } from "./validate-release-env.mjs";

await validateTarget("production", { requireBrowserTarget: false });
