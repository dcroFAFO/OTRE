# Phase 2.4 authorization evidence

Phase 2.4 closes the active authorization and trust-boundary gaps recorded in `phase-2-authorization-inventory.md`. This report records the reproducible evidence for the phase gate.

## Inventory reconciliation

- Base44 function directories, excluding the shared helper directory: **41**.
- Unique function entries in the authorization inventory: **41**.
- Sorted inventory-versus-filesystem comparison: **no differences**.
- Frontend route groups reviewed: staff dashboard, admin clients, admin feedback, admin activity, customer portal and public tracking.

Platform automations and provider callbacks whose deployed caller authenticity is not represented in this repository remain explicit Phase 3 verification dependencies. They were not silently converted into public endpoints or assigned guessed authentication behavior.

## Reproduced failures before enforcement

The policy tests passed before production enforcement, proving that the intended rules were executable independently of the handlers:

| Check | Pre-enforcement result |
| --- | --- |
| Shared staff and invoice-ownership policy | 15/15 tests passed |
| Technician denied from `/admin/activity` before audit read | Failed: one `AuditEvent.list` call occurred before the denial UI |
| Technician denied from `/dashboard/parts` before product read | Failed: the route mounted the catalogue instead of the admin denial UI |
| Customer denied from `/dashboard` before job read | Passed: denial UI rendered and no `Job` read occurred |

These were the only expected failures in the targeted negative browser run: **2 failed, 1 passed**.

## Enforcement completed

| Boundary | Enforcement |
| --- | --- |
| Staff function identity | `authorizeStaff` accepts only an authenticated user with an explicit top-level `admin`, `employee`, `technician` or `staff` role. Mutable customer flags and nested role values do not grant authority. |
| Job, quote and invoice actions | Staff rejection now occurs before request-body parsing, service-role record lookup or mutation. Redundant action-level checks were removed. |
| Invoice PDF and parts sourcing | Staff rejection now occurs before request-body parsing and protected record or integration access. |
| Invoice checkout | Authentication is required. A customer must own the customer-visible invoice through the linked user, stable customer ID, customer-account ID or legacy authenticated email; staff may operate internal invoices. Mismatched invoice/job records are denied. Denials use the same not-found response as missing invoices. Stripe configuration and session creation occur only after authorization and checkout validation. |
| Parts catalogue | `/dashboard/parts` has an admin route guard, so denied staff cannot mount the page or issue product reads. |
| Admin pages | Clients, feedback and activity pages have route-level role/capability guards. The activity query also has a capability-based `enabled` condition as defense in depth. |

## Completed regression gate

| Command or check | Result |
| --- | --- |
| Authorization policy test after final ownership coverage | 16/16 passed |
| `npm test` | 7 files, **80/80 tests passed** |
| `npm run test:e2e` | **19/19 browser workflows passed** |
| Targeted authorization-route browser run | **8/8 passed**: five denied cases issued zero protected reads, and three allowed cases loaded normally |
| Shared authorization TypeScript check | Passed |
| Bundle all six affected Base44 function entries | Passed |
| `npm run build` | Passed, exit 0 |
| `git diff --check` | Passed |
| `npm run lint` comparison | Exactly the Phase 1 baseline: **21** errors, all `unused-imports/no-unused-imports`; no regression |
| `npm run typecheck` comparison | Exactly the Phase 1 baseline: **891** errors with an identical diagnostic-code distribution; no regression |

The unchanged lint and broad checkJs debt is not accepted as final quality. It remains measured work for later cleanup phases; this gate proves that Phase 2.4 introduced no additional diagnostics while its own affected TypeScript module and server bundles pass.

## Phase gate decision

All Phase 2.4 tasks are complete and evidenced: the repository and route inventory is reconciled, policies are tested, known gaps were reproduced, enforcement was added at the earliest practical boundary, negative paths no longer perform protected frontend reads, affected server code compiles/bundles, critical workflows regress cleanly, and no baseline diagnostic debt increased.
