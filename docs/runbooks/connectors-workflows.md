# Connector and workflow runbook

- Contentful runtime synchronization and its public staff button have been removed. Blog reads use Base44 `BlogPost`, `BlogCategory`, and `BlogTag` data only.
- Google Calendar synchronization functions/workflows have been removed because their reference graph was isolated from the local scheduling UI. The local `/dashboard/calendar` remains a Job-based planning view.
- `JobCalendarEvent` and `SyncState` schemas are retained non-destructively; removal requires a separate data/parity migration.
- The remote activation state of deleted workflows is **Needs Verification**. Confirm they are disabled in every Base44 environment before release.
- `google_search_console` remains for explicit sitemap submission and requests `webmasters` plus `email` scopes. Scope justification, authorization, and token refresh are **Needs Verification**.

For every remaining workflow, record owner, trigger, condition, desired enabled state, maximum batch, retry/idempotency behavior, last successful test, and rollback action before production activation.
