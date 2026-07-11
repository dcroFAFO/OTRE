# Phase 2.5 CI quality gates

Phase 2.5 converts the Phase 2 safety net into a repeatable local and GitHub-hosted gate. It deliberately distinguishes passing quality controls from the legacy lint/checkJs debt that later cleanup phases must remove.

## CI contract

| Gate | Implementation | Failure condition |
| --- | --- | --- |
| Reproducible runtime | Node `24.14.0` from `.node-version`; dependencies installed with `npm ci` | Runtime cannot be installed or lockfile install changes/fails |
| Lint ratchet | ESLint JSON diagnostics compared with `config/quality-baseline.json` | Total or any rule category exceeds its Phase 1 budget; unknown rule categories have a zero budget |
| Typecheck ratchet | Non-pretty TypeScript diagnostics compared by diagnostic code | Total or any diagnostic-code category exceeds its Phase 1 budget; unknown codes have a zero budget |
| Backend support modules | Standalone TypeScript check of every non-entry `.ts` module under `base44/functions` | Any support module has a TypeScript error |
| Backend entries | In-memory esbuild bundle of every function directory's `entry.ts`, with `npm:` imports retained as runtime externals | A function lacks an entry file, an import cannot resolve, syntax/bundling fails, or output count differs |
| Unit, component and domain tests | Vitest | Any test fails or is focused/invalid |
| Frontend production build | Vite | Build fails |
| Critical browser workflows | Playwright with the repository-managed Chromium runner and deterministic Base44 fixture | Any browser workflow fails |

`npm run check` executes diagnostics, backend validation, tests and the production build. `npm run check:all` adds all browser workflows and is the complete local equivalent of the two CI jobs.

## GitHub Actions design

- Workflow: `.github/workflows/ci.yml`.
- Triggers: every push, every pull request and manual dispatch.
- Permissions: read-only repository contents.
- Concurrency: superseded runs for the same workflow/ref are cancelled.
- Official action runtimes: `actions/checkout@v7` and `actions/setup-node@v6`.
- Authentication persistence is disabled because the jobs never write to Git.
- Quality/build and browser jobs run independently so GitHub can execute them in parallel.
- Neither job needs application secrets or a live Base44 backend; browser tests explicitly activate the deterministic local fixture.

## Diagnostic debt policy

The budgets reproduce the exact Phase 1 totals and code/rule distribution. A reduction passes immediately; an increase in any existing category or the appearance of a new category fails even when the overall total remains within its ceiling. The budget evaluator itself has tests for equality, reductions, category increases, new categories and inconsistent configuration.

This is a transition control. The final cleanup gate remains ordinary zero-error lint and typecheck. As cleanup removes diagnostics, the committed budget must be lowered so fixed debt cannot be silently reintroduced.

## Phase completion evidence

The final candidate was exercised using the same commands as both GitHub jobs:

| Proof | Result |
| --- | --- |
| Workflow structure parse | Passed; all three triggers, both jobs and read-only contents permission present |
| Package and budget JSON parse | Passed |
| `npm ci --cache /tmp/otre-npm-cache` | Passed from the lockfile; 736 packages installed |
| Lint ratchet | Passed at **21/21**, all in the recorded unused-import rule |
| Typecheck ratchet | Passed at **891/891** with the recorded diagnostic-code ceilings |
| Backend support-module typecheck | **6/6 modules passed** |
| Backend entry bundle | **41/41 function entries passed** |
| Vitest | **8 files, 85/85 tests passed** |
| Vite production build | Passed |
| `npm run check` aggregate | Passed, exit 0 |
| Playwright | **19/19 workflows passed** from the clean install |
| `git diff --check` | Passed |

Together, the passing `npm run check` and `npm run test:e2e` executions are the local equivalent of `npm run check:all` and exactly match the commands in the two GitHub Actions jobs.
