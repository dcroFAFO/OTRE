# Phase 3 dead-code and dependency cleanup evidence

Phase 3 removes only candidates whose current-tree reachability, references and replacement behavior were re-proven after the Phase 2 safety net was complete.

## Revalidation before deletion

The new esbuild-metafile reachability analyser reproduced the Phase 1 result exactly before any deletion:

- application modules: **262**;
- reachable from `src/main.jsx`: **216**;
- unreachable: **46**, matching every entry in the Phase 1 register.

Exact import-path scans found no incoming references from reachable source, tests, routes or configuration. References within the candidate set formed a closed unreachable subgraph. The dormant `sourcePartsForJob` name appeared only in its unreachable panel, and the `repair_assistant` name appeared only in its own agent resource.

## Candidate correction: checklist restored

Revalidation disproved one Phase 1 classification. `JobChecklistPanel` was not a duplicate: it was the only UI capable of updating checklist items, while active templates still create checklists and active workflow rules prevent readiness/completion with unfinished items.

The component was therefore retained and repaired:

- mounted in the desktop intake workspace;
- mounted in the mobile repair workspace;
- made button-safe and guaranteed to clear its busy state;
- covered by a browser case that invokes `toggle_checklist` and observes `1/1 done`.

After restoration, reachability changed to 217 reachable and 45 unreachable modules, proving the intended module—not an unrelated import—was recovered. All five staff workflows passed at that gate.

## Removed source

| Scope | Result |
| --- | ---: |
| Unreachable frontend modules removed under the original **Remove** disposition | 44 |
| Obsolete `businessConfig.js` compatibility barrel removed after proving active `platformConfig.js` replacement | 1 |
| Dormant interactive Base44 function removed | 1 (`sourcePartsForJob`) |
| Unused Base44 agent removed | 1 (`repair_assistant`) |
| **Tracked files deleted** | **47** |
| **Tracked lines deleted** | **4,439** |

The frontend result is **217/217 reachable application modules and zero unreachable modules**. `test:reachability` now fails on any future unreachable application module and is part of `npm run check`.

Backend resources changed from 41 to **40 function entries** and from 2 to **1 agent**. The remaining support agent is actively invoked by the portal.

## Dependency pruning

Reference scans were repeated after source deletion. Packages whose only importer was deleted, plus previously unreferenced placeholders, were removed from the manifest and lockfile:

- runtime dependencies: **66 → 31** (35 removed);
- development dependencies: **26 → 23** (3 removed);
- clean-install package count: **736 → 675** (61 packages removed including transitives).

The removed set covers unused form/validation, Stripe client, mapping/editor/rendering, animation/helper and obsolete Radix primitive packages, plus three unused development tools. Packages required as peers or by configuration/tooling were retained even where application import scans alone could not prove their need.

The production dependency audit improved from 31 findings (10 high, 20 moderate, 1 low) to **10 findings (5 high, 5 moderate, 0 low/critical)**. Remaining findings are active dependency paths and require version/remediation work rather than dead-package deletion.

## Diagnostic ratchet

- lint debt decreased from **21 to 15**, all still `unused-imports/no-unused-imports`;
- the committed lint budget was lowered to 15;
- checkJs remained exactly **891** with the same diagnostic-code distribution;
- activating the checklist initially exposed an extra argument diagnostic; the phase gate stopped and the real call contract was corrected before proceeding.

## Platform-triggered resources explicitly deferred

The repository contains no source-controlled entity-automation or schedule registrations. Consequently, Phase 3 did **not** delete these migration candidates:

- `assignCustomerIdToNewUser`;
- `assignJobIdToNewJob`;
- `autoGenerateInvoice`;
- `createCustomerForUser`;
- `linkJobToCustomer`.

Likewise, migration-only entities and legacy route aliases remain until data/external-link evidence exists. Signed webhook, schedule and calendar connector entry points remain protected by the Phase 2 allowlist. This is an evidence-based deferral, not an assumption that the legacy functions are needed forever.

## Verification

The clean-install implementation gate passed with:

- lint ratchet **15/15** and typecheck ratchet **891/891**;
- reachability **217/217**;
- backend support-module typecheck **6/6**;
- backend bundle **40/40**;
- Vitest **85/85**;
- production build passing.

The final Phase 3 candidate passed:

- `npm run check:all`, exit 0;
- Playwright **20/20** (including the restored checklist flow);
- manifest, lockfile, budget and workflow parsing;
- `npm ls --depth=0` with no invalid/extraneous direct dependency;
- `git diff --check`.

Phase 3 is therefore complete for repository-provable dead code. Deferred live-platform/data migrations remain explicitly outside this deletion batch.
