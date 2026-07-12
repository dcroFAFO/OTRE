# Phase 5 dependency evidence

Date: 2026-07-11
Branch: `cleanup/codebase-remediation`

## Result

Phase 5 is complete. All advisories reported for the retained dependency tree were resolved through semver-compatible lockfile updates. No forced update and no declared major-version change was used.

| Measure | Before compatible update | Phase 5 result |
| --- | ---: | ---: |
| Total npm advisories | 53 | 0 |
| Critical | 0 | 0 |
| High | 19 | 0 |
| Moderate | 29 | 0 |
| Low | 5 | 0 |
| Clean-install packages | 671 | 671 |

The initial count reflects the current registry advisory set on 2026-07-11, which had grown since the earlier Phase 3 audit snapshot.

## Remediation completed

`npm update` refreshed 132 packages inside the existing `package.json` ranges. Representative fixed chains include:

| Dependency chain | Resolved version |
| --- | --- |
| Vite / Rollup / Picomatch | Vite 6.4.3, Rollup 4.62.2, Picomatch 4.0.5 |
| PostCSS tooling | PostCSS 8.5.16 |
| React Router | react-router and react-router-dom 6.30.4 |
| Base44 SDK HTTP upload chain | Axios 1.18.1, form-data 4.0.6 |
| Base44 SDK socket chain | engine.io-client 6.6.6, socket.io-parser 4.2.6, ws 8.21.0 |
| PDF sanitization | DOMPurify 3.4.11 |
| Chart utility chain | Lodash 4.18.1 |
| ESLint glob/cache chain | ESLint 9.39.5, minimatch 3.1.5, updated config/cache packages |

`package.json` was unchanged; the reproducible resolution is captured in `package-lock.json`.

## Clean-install and gate proof

1. `npm ci` completed from the updated lockfile and installed 671 packages.
2. `npm audit --audit-level=low` reported `found 0 vulnerabilities`.
3. The final `npm run check:all` run passed:

| Gate | Result |
| --- | --- |
| Strict lint budget | 0/0 diagnostics |
| Full-source typecheck budget | 0/0 diagnostics |
| Frontend reachability | 217/217 reachable; 0 unreachable |
| Backend support typecheck | 6/6 modules |
| Backend function bundle validation | 40/40 entries |
| Vitest unit/component suite | 9 files; 87/87 tests |
| Production build | Passed |
| Playwright browser regression | 20/20 workflows passed |

## Deliberate non-breaking boundary

The clean install reports that Recharts 2.x is no longer an active upstream branch. Recharts remains reachable application code, is audit-clean at 2.15.4 with its patched transitive tree, and a v3 move is a breaking library migration rather than dead-code or advisory remediation. It is therefore recorded for a separately scoped modernization change rather than forced into this cleanup phase.
