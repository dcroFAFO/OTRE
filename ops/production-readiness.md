# Production exit gates

- [ ] Git commit matches the retained release manifest and deployed frontend.
- [ ] Entity/RLS, function, workflow, agent, connector, and secret-name parity verified.
- [ ] Backend shared-import deployment compatibility verified in staging.
- [ ] Staging and production data/provider accounts are isolated.
- [ ] CI config, backend, lint, typecheck, unit, build, and bundle gates pass.
- [x] Production and full dependency audits report zero vulnerabilities after controlled lockfile-only transitive updates and full regression validation.
- [ ] Critical Playwright journeys pass on Chromium, Firefox, and WebKit.
- [ ] Live role/RLS matrix and canonical customer relationships are verified.
- [ ] Retired online-payment functions and webhooks are absent/disabled in the target app; manual-payment-only behavior is verified.
- [ ] Workflow activation matches desired state; deleted Calendar workflows are disabled remotely.
- [ ] Contentful connector/use is absent from the deployed artifact.
- [ ] Error reporting, dashboards, alerts, and owners are tested.
- [ ] Backup/checkpoint restore and frontend/function rollback are demonstrated.
- [ ] Public sitemap contains public indexable routes only; private routes remain noindex/disallowed.
- [ ] No unresolved critical/high finding lacks written risk acceptance.

## Current isolated-staging evidence

- [x] 68 entity schemas and 49 functions deployed to remediation staging; all required shared imports were accepted by the Base44 bundler.
- [x] Authenticated PII-safe SDK entity and negative-path function probes passed without creating customer or financial records.
- [x] Guarded synthetic manual-payment journey reconciled Invoice and Job state and verified complete cleanup.
- [x] 32 deployed-site checks passed on mobile/desktop Chromium and WebKit.
- [ ] Firefox deployed-site checks (browser binary unavailable on the current workstation).
- [ ] Five local workflows exist in source but are absent remotely; Base44 CLI currently exposes inspection, not workflow publication.
- [ ] Required staging secrets and Google Search Console authorization are absent; positive OTP, provider notification, and scheduled-workflow journeys remain blocked.
- [ ] Content-Security-Policy and Permissions-Policy response headers are absent on the staging site.
