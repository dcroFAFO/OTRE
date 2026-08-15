import { validateTarget } from "./validate-release-env.mjs";

await validateTarget("staging", { requireBrowserTarget: true });
