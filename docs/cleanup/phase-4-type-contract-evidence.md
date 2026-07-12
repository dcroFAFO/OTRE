# Phase 4 type-contract evidence

Date: 2026-07-11
Branch: `cleanup/codebase-remediation`

## Result

Phase 4 is complete. The frontend quality ratchet is now zero-tolerance for both lint and TypeScript/checkJs diagnostics, and type coverage includes the complete `src` JavaScript/JSX tree plus declaration files and source-level tests.

| Measure | Phase 1 baseline | Phase 4 result |
| --- | ---: | ---: |
| ESLint diagnostics | 21 | 0 |
| TypeScript/checkJs diagnostics | 891 | 0 |
| Direct typecheck scope | Selected pages and `.js` components, with UI/API/lib exclusions | All `src/**/*.js`, `src/**/*.jsx`, and `src/**/*.d.ts` |

`config/quality-baseline.json` now sets both `lint.maxTotal` and `typecheck.maxTotal` to `0`, with no permitted diagnostic categories.

## Remediation completed

1. Added explicit DOM and Radix prop/ref contracts to every active shared `forwardRef` primitive. This removed the ref-only component contracts that caused most TS2322 and TS2559 failures.
2. Made optional component props explicit at their definitions, including SEO fallbacks, shared status/service badges, cards, reveal wrappers, authorization gates, form fields, and layout helpers.
3. Replaced untyped empty state objects with stable form, error, invoice, quote, booking, and feedback shapes.
4. Added boundary types for dynamic Base44 invoice/job records and narrowed the LLM structured response before reading `reply`.
5. Aligned UI calls with the current server-backed service signatures and removed the obsolete actor/onUpdate prop chains those calls no longer consume.
6. Replaced the invalid Radix checkbox DOM mutation with the supported `"indeterminate"` checked state.
7. Updated React Query invalidation to the current `{ queryKey }` contract.
8. Repaired the non-browser app-parameter storage fallback so it implements the Storage methods the module calls, and prevented server-side access to `window.location`.
9. Added the missing Vite environment declaration and normalized optional Axios-style error response data without weakening error types.
10. Expanded `jsconfig.json` to cover all source JavaScript, JSX, declaration, and source test files; all newly exposed diagnostics were fixed.

## Gate proof

The final `npm run check:all` run passed in full:

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

The browser suite covered admin and customer authorization, registration/profile setup, guest booking, public tracking and quote approval, staff intake/lifecycle/checklist/quote/invoice operations, public navigation, and store checkout.
