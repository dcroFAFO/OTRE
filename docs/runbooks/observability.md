# Observability runbook

## Implemented foundation

- React render errors are contained by `AppErrorBoundary`.
- Browser errors and unhandled promise rejections flow through `reportClientError`.
- Rich diagnostics are redacted and capped in memory; only a minimal subset survives a browser restart.
- Optional remote reports are minimal and same-origin only.
- Admins can view release/reporting/local error counts at `/settings/system-health`.

## Required production integration

Provide a same-origin ingestion endpoint before enabling `VITE_CLIENT_ERROR_ENDPOINT`. It must authenticate or rate-limit submissions, reject extra properties, retain no IP longer than operationally required, and alert without including PII.

Production dashboards should cover function errors/latency, workflow retries/dead letters, connector sync age, rejected attempts to reach retired online-payment actions, notification provider rejection, relationship invariants, bundle release id, and synthetic journey health. Provider, retention, alert owners, and SLO thresholds remain product/operations decisions.
