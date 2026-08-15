# Rollback runbook

Rollback is triggered by authorization elevation/lockout, payment or notification duplication, relationship invariant failures, unexplained write-on-read behavior, sustained function failures, or a critical browser regression.

1. Stop the rollout and record release id, time, symptoms, and affected workflows.
2. Disable newly activated workflows/connectors and feature flags first.
3. Redeploy the previous retained frontend/function artifact or restore the recorded Base44 checkpoint.
4. Do not destructively roll schema backwards. Additive fields remain; use compatibility readers and forward repair.
5. Replay payments/notifications only through provider event ids and application idempotency keys.
6. Reconcile affected entities and preserve audit/provider evidence.
7. Verify authentication, booking, tracking, invoice/payment, staff Job operations, and public routes before reopening.

The exact Base44 checkpoint restore mechanism and data-backup recovery time are **Needs Verification** in staging before production release.
