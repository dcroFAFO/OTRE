# On The Run Electrics

React/Vite frontend and Base44 backend configuration for the On The Run Electrics repair, booking, customer portal, staff operations, invoicing, store, and publishing application.

The checked-out Git branch is the source of truth. Base44 environments are deployment targets and must be reconciled against a generated release manifest before publishing.

## Local setup

1. Use Node 22 (`.nvmrc` and `.node-version`).
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and set the non-secret `VITE_*` values for an isolated development or staging app.
4. Run `npm run dev`.

Never place Stripe, Twilio, Resend, Ecwid, Google, or other provider secrets in `VITE_*` variables. Those values are shipped to browsers.

## Validation

- `npm run validate:config` — entity/workflow/route/SEO configuration invariants.
- `npm run validate:backend` — Deno lint and typecheck for Base44 function/shared TypeScript.
- `npm run lint` — frontend static analysis.
- `npm run typecheck` — opt-in JavaScript/JSX type checking. Critical runtime modules use `// @ts-check`; expand this ratchet as legacy JSDoc contracts are repaired.
- `npm test` — Vitest suite.
- `npm run build` — production frontend build.
- `npm run check:bundle` — gzip bundle budgets.
- `npm run test:e2e:local` — production build followed by Playwright.
- `npm run release:manifest` — hashes deployable Base44 and frontend release inputs into `dist/release-manifest.json`.

## Release operations

Start with [deployment.md](docs/runbooks/deployment.md). Rollback, monitoring, connector/workflow, environment, and privacy controls live under `docs/runbooks`, `docs/architecture`, and `ops`.

Local validation is not proof of a live Base44 deployment. Production publishing, schema parity, secrets, connector authorization, workflow activation, backups, and rollback checkpoints require explicit verification in the target environment.
