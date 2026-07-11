# OTRE cleanup baseline

This document records the reproducible starting point for the codebase cleanup. It is evidence, not a target state. Known failures must be fixed in later phases rather than hidden by weakening checks.

## Provenance

- Repository: `dcroFAFO/OTRE`
- Branch: `cleanup/codebase-remediation`
- Starting commit: `64a4cde68bceec2a14f06d05f95f2d28004dfff9`
- Starting branch relationship: identical to `origin/main`
- Baseline date: 2026-07-11 (Australia/Brisbane)
- Package installation: `npm ci --cache /tmp/otre-npm-cache`
- Installed packages: 630
- Tracked files modified while capturing the baseline: none

## Repository inventory

| Measure | Baseline |
| --- | ---: |
| Tracked files | 362 |
| Files under `src` | 263 |
| Page files | 38 |
| Component files | 184 |
| Base44 entities | 42 |
| Base44 functions | 41 |
| Base44 agents | 2 |
| Base44 connectors | 1 |
| Test files | 0 |
| CI workflow files | 0 |

## Verification results

| Command/check | Exit | Result |
| --- | ---: | --- |
| `npm ci --cache /tmp/otre-npm-cache` | 0 | Clean lockfile installation completed; 630 packages installed. |
| `npm run build` | 0 | Vite frontend build passed. Base44 local proxy was disabled because `VITE_BASE44_APP_BASE_URL` was not set. |
| `npm run lint` | 1 | 21 errors, all currently reported as unused imports. |
| `npm run typecheck` | 2 | 891 TypeScript/checkJs errors. |
| `npm audit --omit=dev` | 1 | 31 production advisories: 10 high, 20 moderate, 1 low, 0 critical. |
| Test script check | n/a | No `test` script exists. |
| Test file scan | n/a | No test files exist. |
| CI scan | n/a | No `.github/workflows` files exist. |
| Literal secret scan | 0 | No candidate hard-coded secret assignments were found. |
| Manifest check | n/a | `public/manifest.json` and the `public` directory are absent although `index.html` references `/manifest.json`. |

The production audit reports affected direct dependency paths rooted at `@base44/sdk`, `jspdf`, `lodash`, `postcss`, `react-quill`, `react-router-dom`, `recharts`, `tailwindcss`, and `tailwindcss-animate`. A reported direct path can be vulnerable through a transitive package; dependency remediation must inspect the resolved tree before changing packages.

## Typecheck error distribution

| Error | Count |
| --- | ---: |
| TS2322 | 558 |
| TS2339 | 120 |
| TS2559 | 99 |
| TS2741 | 50 |
| TS2740 | 26 |
| TS2739 | 25 |
| TS2554 | 7 |
| TS2345 | 2 |
| TS2353 | 1 |
| TS2362 | 1 |
| TS2363 | 1 |
| TS2698 | 1 |

The current `jsconfig.json` checks selected components and pages while excluding other application code. The 891 errors therefore do not represent a complete repository-wide type assessment.

## Bundle baseline

| Artifact | Size |
| --- | ---: |
| `dist` total | 1.9 MB |
| Main JavaScript asset | 1,816.8 KB |
| Main CSS asset | 109.2 KB |

Vite currently suppresses warnings with `logLevel: "error"`, and all route pages are imported synchronously. Later phases must restore warnings and establish route-level splitting before applying a bundle budget.

## Reachability baseline

- Source modules scanned: 262
- Modules reachable from `src/main.jsx`: 216
- Modules not reachable through static or literal dynamic imports: 46

The complete classified list is maintained in `docs/cleanup/phase-1-inventory.md`. Static unreachability is not deletion proof for Base44 functions, webhooks, scheduled jobs, entity automations, connector callbacks, or modules loaded through non-literal runtime conventions.

## Baseline interpretation

- A passing Vite build validates reachable frontend modules only. It does not compile or execute the Deno/Base44 backend functions.
- Audit results are time-sensitive and must be regenerated when dependencies change.
- No deployed Base44 schedule, entity automation, webhook registration, secret value, or live data record is represented by these local checks.
- Existing failures are accepted only as the measured starting point. The final cleanup definition requires lint, typecheck, tests, and build to pass without suppressing legitimate failures.
