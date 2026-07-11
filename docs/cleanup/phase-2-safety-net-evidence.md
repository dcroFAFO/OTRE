# Phase 2 safety-net exit evidence

Phase 2 establishes the proof required before source deletion or consolidation begins. This document reconciles the committed test, authorization, backend-build and CI layers and states their limits.

## Provenance

- Phase starting point: `64a4cde68bceec2a14f06d05f95f2d28004dfff9`.
- Baseline and inventory: `77cb130`.
- Unit/component harness: `c5c2545`.
- Critical browser workflows: `3e519ae`.
- Backend domain rules: `b19247e`.
- Authorization boundaries: `5764f43`.
- CI gates: `e659ec0`.

## Coverage reconciliation

### Unit, component, domain and tooling tests

| Test file | Assertions | Protected behavior |
| --- | ---: | --- |
| `src/lib/phone.test.js` | 9 | Australian mobile normalization and rejection |
| `src/components/shared/StatusPill.test.jsx` | 3 | Canonical, resolver-specific and explicit status presentation |
| `tests/backend/job-actions-domain.test.ts` | 11 | Status normalization, transitions, checklist/invoice/payment prerequisites, terminal states and idempotency |
| `tests/backend/quote-actions-domain.test.ts` | 9 | Rounding, markup, quantities, labour minimums and quote totals |
| `tests/backend/invoice-actions-domain.test.ts` | 7 | Safe line items, non-negative math, discounts, totals and inventory usage pricing |
| `tests/backend/checkout-domain.test.ts` | 25 | Invoice minor units plus server-authoritative store products, cart merging, limits, pricing and rejection paths |
| `tests/backend/authorization.test.ts` | 16 | Explicit staff authority and invoice visibility/ownership decisions |
| `tests/tooling/diagnostic-budget.test.ts` | 5 | CI ratchet equality, reduction and failure behavior |
| **Total** | **85** | **8 test files** |

Vitest is configured with `allowOnly: false`; the Phase 2 scan found no focused or skipped unit/browser tests. Playwright separately uses `forbidOnly: true`.

### Browser workflows

The 19 Playwright cases cover:

- five denied-route cases that assert protected records/functions are not read;
- three positive admin/technician route cases;
- registration OTP initiation and completed customer profile setup;
- guest booking and public navigation;
- tracking-token invoice payment and quote approval;
- staff intake, lifecycle transition, quote creation and invoice publication;
- public store cart and checkout initiation.

The fixture records entity reads/writes, function calls, authentication operations and integrations. Tests therefore assert both visible outcomes and key orchestration side effects without depending on a mutable live account.

### Backend and authorization coverage

- All **41/41** Base44 function directories are present in the authorization inventory.
- Every active interactive trust-boundary gap found in Phase 2.4 has an early policy check or a documented public/provider boundary.
- All **6/6** non-entry TypeScript support modules pass a standalone TypeScript check.
- All **41/41** function entries bundle with runtime `npm:` imports treated as Deno/Base44 externals.
- Domain logic extracted from job, quote, invoice and both checkout functions is directly tested.

### Continuous enforcement

- `npm run check` gates diagnostic budgets, backend support modules/entries, all 85 Vitest assertions and the production build.
- `npm run test:e2e` gates all 19 browser workflows.
- `.github/workflows/ci.yml` runs both gates from independent clean installs with read-only repository permission.
- `npm run check:all` is their complete local equivalent.

## Known limits and explicit deferrals

This safety net does not claim to prove behavior that is absent from the repository:

- deployed Base44 entity automations, schedules, connector callback authentication, secrets and live RLS policy;
- Stripe/provider delivery beyond locally tested signature/domain logic and deterministic frontend orchestration;
- production data migrations or the live relationship consistency of legacy customer/job records;
- quantitative statement/branch coverage of the entire generated UI;
- performance, cross-browser and automated accessibility conformance;
- resolution of the 21 lint, 891 checkJs and time-sensitive dependency-audit baseline findings.

Those items remain later-phase work or require live-platform evidence. In particular, platform-triggered functions cannot be deleted solely because frontend reachability analysis does not find a caller.

## Phase 3 deletion rules enabled by this gate

1. Delete in classified, reviewable batches rather than as one bulk change.
2. Prove static frontend unreachability again immediately before each deletion batch.
3. Search route, service, test, entity, function and literal/dynamic-import references for every target.
4. Preserve or migrate behavior before deleting a duplicate implementation.
5. Do not remove automation/webhook/connector functions without repository configuration or deployed-platform evidence for their replacement/absence.
6. Run the proportional targeted tests first, then `npm run check`; run all browser workflows for user-visible or orchestration changes.
7. Record exact removals, replacements and verification evidence in the cleanup report before committing each phase.

## Final Phase 2 gate

The final candidate passed the complete aggregate gate:

| Proof | Result |
| --- | --- |
| `npm run check:all` | Passed, exit 0 |
| Diagnostic ratchets | Lint **21/21**; typecheck **891/891**; no category increase |
| Backend validation | **6/6** support modules and **41/41** function entries passed |
| Vitest | **8 files, 85/85 assertions passed** |
| Production build | Passed |
| Playwright | **19/19 workflows passed** |
| Focus/skip scan | No focused or skipped tests found; framework guards enabled |
| Workflow and JSON parse | Passed |
| Git diff check | Passed |

The nonzero diagnostic values are the transparent Phase 1 ratchet ceilings, not a claim of final source cleanliness. Phase 2 is complete: regressions are gated, known limitations are explicit and Phase 3 may begin classified deletion/consolidation work under the rules above.
