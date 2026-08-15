# Deployment runbook

1. Confirm the intended Git commit/branch and a clean, reviewed diff.
2. Confirm the target is the isolated staging app. Production must not be used for exploratory validation.
   - Current remediation staging app: `6a7dd641cf8b4ebde9fbe70b` (`OTRE Remediation Staging`).
   - Production source app: `6a2069bac12b203bbb93b0b3`. Never use this ID for migration rehearsal or synthetic journey data.
3. Run `npm ci`, configuration/backend validation, lint, typecheck, unit tests, production build, and bundle budget checks.
   - Run both `npm audit --omit=dev --audit-level=moderate` and `npm audit --audit-level=moderate`. Do not use a blind `npm audit fix`; review Base44 SDK/transitive updates and build-tool changes under the full regression suite. On 2026-08-14 the lockfile was advanced to patched, range-compatible transitive releases for Socket.IO/ws, picomatch, Vite/Rollup, Babel, AJV, and related build utilities; both audits then reported zero vulnerabilities.
4. Generate `dist/release-manifest.json` and retain it with CI evidence. Release manifests with `workingTreeDirty: true` are diagnostic only and must never be deployed.
5. Compare target Base44 entity schemas/RLS, functions, workflows, agents, connectors, and SDK versions with the manifest. Any remote-only change must be incorporated or explicitly rejected.
6. Verify required secrets by name, connector scopes, retired online-payment functions/webhooks are disabled, and workflow activation state without printing values.
   - `OTP_RATE_LIMIT_SECRET` must be a server-only, independent high-entropy value of at least 32 bytes (64 hex characters is recommended). Rotation resets throttle buckets but must not be reused from Twilio credentials or exposed through `VITE_*` configuration.
   - Set server-only `TRUST_PROXY_HEADERS=true` only after verifying that Base44 strips caller-supplied forwarding headers and injects authoritative `x-forwarded-for` or `x-real-ip` values. Leave it unset/false to use the deliberately shared fail-closed throttle bucket until that gateway contract is proven.
7. Create and record a Base44 rollback checkpoint or equivalent export. Backup/restore coverage is **Needs Verification** until exercised.
8. Deploy to staging and run critical Playwright journeys plus backend/workflow/connector checks.
   - Before synthetic data is created, run the PII-safe SDK probe from the staging-bound checkout: `Get-Content -Raw scripts/base44-runtime-readiness.ts | npx base44 exec --privileged`.
   - The probe must report an authenticated admin session and every listed entity as available. It never proves RLS by itself; follow it with separate customer/admin/guest journey accounts.
   - After functions deploy, run `Get-Content -Raw scripts/base44-function-readiness.ts | npx base44 exec --privileged`. Its invalid identifiers exercise read-only or pre-mutation rejection paths; review the expected 400/403/404 responses rather than treating every non-200 response as failure.
   - Run deployed-site browser checks without starting a local preview by setting `PLAYWRIGHT_BASE_URL` to the isolated staging URL. The Playwright config omits its local `webServer` whenever that variable is present.
9. Obtain release approval. Deploy the identical commit/artifact to production.
10. Monitor the production exit gates in `ops/production-readiness.md`.

Never relink the app, mutate production data, activate a connector, or publish merely because local validation passed.

## Remediation staging evidence — 2026-08-14

- A full Base44 deployment to app `6a7dd641cf8b4ebde9fbe70b` succeeded with 68 entities, 49 functions, one connector configuration, and the site at `https://otre-remediation-staging-e9fbe70b.base44.app`.
- Base44 enforces a maximum of 50 functions per app. This release intentionally contains 49; `npm run validate:config` fails if the ceiling is exceeded or retired functions return.
- All 49 remote function names match the local deployable set. The deployment also proved that the current 28 cross-function shared imports bundle successfully for this staging artifact.
- The privileged PII-safe SDK probe authenticated as `admin` and found every required entity schema. Only the staging User record existed; no Customer, Invoice, PaymentEvent, Attachment, notification, feedback-invitation, or verification-use record was created by the probes.
- Live negative-path probes reached public configuration/catalogue/sitemap, bootstrap, admin customer read, attachment, manual-invoice, booking, signup OTP, phone-claim, notification-preference, and outbox functions with the expected 200/400/403/404 boundaries.
- The guarded `scripts/base44-staging-payment-journey.ts` check created a no-contact synthetic staff job, created and issued an invoice, recorded the exact manual cash payment, verified both Invoice and Job projected `paid` state, and removed every synthetic entity record before exit.
- Thirty-two deployed-site browser checks passed across mobile/desktop Chromium and WebKit: landing/about/contact/terms accessibility, core public routes, guest-booking validation, authentication form labels, and enquiry-only catalogue behavior. Firefox remains a CI/staging requirement because its browser binary is not installed in this workstation environment.
- Staging currently has no secrets, the Google Search Console connector is not authorized, and `base44 workflows list` reports zero workflows. The CLI exposes workflow inspection only and the standard deploy omitted the five local workflow definitions. Provider-backed positive OTP/notification journeys, storage-object ownership/finalization, and workflow activation therefore remain blocked until the staging environment is configured and the workflows are created or imported through a supported Base44 control plane. Manual payment itself is verified independently of those providers.
- The deployed site returns HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: DENY`. Content-Security-Policy and Permissions-Policy headers are absent and require platform/deployment configuration verification before production.

## Identity rollout order

Production identity changes must be staged because existing User roles and duplicate Customer links may violate the final schema constraints.

Read-only authenticated Base44 verification on 2026-08-14 found 37 production users: 4 `admin`, 4 `customer`, and 29 legacy `user` roles. It also found the manual payment provider inactive with legacy mode `not_configured`, while retired Stripe, Calendar, legacy identity-linking source artifacts, and both raw-entity AI agents (`repair_assistant` and `support_assistant`) remain in the production app. These observations contain no customer PII and make the migration and remote-retirement steps below mandatory, not optional.

1. Deploy only the additive identity entities, shared identity helpers, and `identityMigration` function to staging.
2. Run migration `dry_run`; retain the `IdentityMigrationRun` and every issue/change record.
3. Resolve duplicate `Customer.user_id`, unknown roles, and ambiguous email/phone matches. Do not auto-merge conflicts.
4. Run migration `apply` in staging and repeat the role/RLS/ownership matrix.
5. Only after zero unresolved blockers, deploy the canonical role enum, unique Customer link, fail-closed runtime role checks, admin-only mixed-record RLS, safe DTO functions, and legacy-workflow removals together. Legacy roles are migration input only and never grant runtime admin access.
6. Repeat this sequence in production during a maintenance window with a checkpoint and tested rollback. Never one-shot the strict schema before the data audit.
