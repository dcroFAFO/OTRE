import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

const DAY_MS = 24 * 60 * 60 * 1000;
const FEEDBACK_DELAY_MS = 12 * 60 * 60 * 1000;
const MAX_SCAN = 200;
const MAX_QUEUE = 50;
const CLEANUP_BATCH_LIMIT = 50;

function requestId(req: Request) {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

function ok(data: unknown, id: string, status = 200) {
  return Response.json({ ok: true, data, request_id: id }, { status });
}

function fail(code: string, message: string, id: string, status: number) {
  return Response.json(
    { ok: false, error: { code, message }, request_id: id },
    { status },
  );
}

function clean(value: unknown, maxLength = 240) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(
    0,
    maxLength,
  );
}

function automationsEnabled() {
  return Deno.env.get("AUTOMATIONS_ENABLED") === "true";
}

function timestamp(value: unknown) {
  const parsed = new Date(String(value || "")).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

async function requireAdmin(base44: any) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return { error: "unauthorized", status: 401 };
  // Scheduled automations execute as their creator. Production must use the
  // durable admin automation-owner account, never a staff member's identity.
  if (user.role !== "admin") return { error: "forbidden", status: 403 };
  return { user };
}

async function reserveFeedbackEvent(db: any, invoice: any, job: any) {
  const paidAt = clean(
    invoice.paid_at || invoice.paid_date || invoice.updated_date,
    100,
  );
  const eventKey = `feedback_request:${invoice.id}:${paidAt}`;
  const existing = await db.NotificationEvent.filter(
    { event_key: eventKey },
    "-created_date",
    1,
  ).catch(() => []);
  if (existing[0]) return { record: existing[0], created: false };
  try {
    const record = await db.NotificationEvent.create({
      event_key: eventKey,
      related_entity_type: "Invoice",
      related_entity_id: invoice.id,
      job_id: job.id,
      customer_id: invoice.customer_id || job.customer_id || "",
      customer_account_id: invoice.customer_account_id ||
        job.customer_account_id || "",
      event_version: paidAt,
      event_data: { invoice_id: invoice.id },
      source: "scheduled",
      status: "pending",
      occurred_at: new Date().toISOString(),
    });
    return { record, created: true };
  } catch {
    const raced = await db.NotificationEvent.filter(
      { event_key: eventKey },
      "-created_date",
      1,
    ).catch(() => []);
    if (!raced[0]) {
      throw new Error("Could not reserve feedback notification event.");
    }
    return { record: raced[0], created: false };
  }
}

function retentionPolicies(now: number) {
  const cutoff = (ageMs: number) => new Date(now - ageMs).toISOString();
  return [
    {
      name: "contact_verification_attempts_30d",
      entity: "ContactVerificationAttempt",
      query: { attempted_at: { $lt: cutoff(30 * DAY_MS) } },
      sort: "attempted_at",
      cutoff: cutoff(30 * DAY_MS),
      eligible: () => true,
    },
    {
      name: "contact_verification_proofs_expired_7d",
      entity: "ContactVerificationProof",
      query: { proof_expires_at: { $lt: cutoff(7 * DAY_MS) } },
      sort: "proof_expires_at",
      cutoff: cutoff(7 * DAY_MS),
      eligible: () => true,
    },
    {
      name: "phone_verification_proofs_expired_7d",
      entity: "PhoneVerificationProof",
      query: { proof_expires_at: { $lt: cutoff(7 * DAY_MS) } },
      sort: "proof_expires_at",
      cutoff: cutoff(7 * DAY_MS),
      eligible: () => true,
    },
    {
      name: "phone_verification_uses_90d",
      entity: "PhoneVerificationUse",
      query: { status: { $in: ["completed", "failed", "reserved"] } },
      sort: "created_date",
      cutoff: cutoff(90 * DAY_MS),
      eligible: (row: any) => {
        const age = now - timestamp(
          row.completed_at || row.consumed_at || row.reserved_at ||
            row.created_date,
        );
        if (row.status === "completed") return age >= 90 * DAY_MS;
        if (row.status === "failed") return age >= 30 * DAY_MS;
        return row.status === "reserved" && age >= 7 * DAY_MS;
      },
    },
    {
      name: "rate_limit_hits_14d",
      entity: "RateLimitHit",
      query: { occurred_at: { $lt: cutoff(14 * DAY_MS) } },
      sort: "occurred_at",
      cutoff: cutoff(14 * DAY_MS),
      eligible: () => true,
    },
    {
      name: "notification_leases_terminal_7d",
      entity: "NotificationWorkLease",
      query: {
        status: { $in: ["released", "expired"] },
        expires_at: { $lt: cutoff(7 * DAY_MS) },
      },
      sort: "expires_at",
      cutoff: cutoff(7 * DAY_MS),
      eligible: () => true,
    },
    {
      name: "notification_leases_stale_active_1d",
      entity: "NotificationWorkLease",
      query: {
        status: "active",
        expires_at: { $lt: cutoff(DAY_MS) },
      },
      sort: "expires_at",
      cutoff: cutoff(DAY_MS),
      eligible: () => true,
    },
  ];
}

async function runRetentionCleanup(db: any, now: number) {
  const policies = [];
  for (const policy of retentionPolicies(now)) {
    const summary = {
      policy: policy.name,
      entity: policy.entity,
      cutoff: policy.cutoff,
      scanned: 0,
      eligible: 0,
      deleted: 0,
      failed: 0,
      status: "ok",
    };
    const entity = db[policy.entity];
    let rows;
    try {
      rows = await entity.filter(
        policy.query,
        policy.sort,
        CLEANUP_BATCH_LIMIT,
      );
    } catch {
      summary.status = "scan_failed";
      policies.push(summary);
      continue;
    }
    summary.scanned = rows.length;
    for (const row of rows) {
      if (!policy.eligible(row) || !row.id) continue;
      summary.eligible += 1;
      try {
        await entity.delete(row.id);
        summary.deleted += 1;
      } catch {
        summary.failed += 1;
        summary.status = "partial";
      }
    }
    policies.push(summary);
  }
  return {
    batch_limit_per_policy: CLEANUP_BATCH_LIMIT,
    policies,
    deleted: policies.reduce((total, policy) => total + policy.deleted, 0),
    failed: policies.reduce((total, policy) => total + policy.failed, 0),
  };
}

Deno.serve(async (req: Request) => {
  const id = requestId(req);
  try {
    if (req.method !== "POST") {
      return fail("method_not_allowed", "Use POST for this action.", id, 405);
    }
    if (!automationsEnabled()) {
      return fail(
        "automation_disabled",
        "Scheduled notification automations are disabled.",
        id,
        503,
      );
    }
    const base44 = createClientFromRequest(req);
    const principal = await requireAdmin(base44);
    if (principal.error) {
      return fail(
        principal.error,
        principal.error === "unauthorized"
          ? "An administrator session is required."
          : "Administrator access is required.",
        id,
        principal.status,
      );
    }

    const db = base44.asServiceRole.entities;
    const invoices = await db.Invoice.filter(
      { status: "paid" },
      "-paid_at",
      MAX_SCAN,
    ).catch(() => []);
    const now = Date.now();
    let queued = 0;
    let duplicates = 0;
    let skipped = 0;

    for (const invoice of invoices) {
      if (queued >= MAX_QUEUE) break;
      const paidAt = timestamp(
        invoice.paid_at || invoice.paid_date || invoice.updated_date,
      );
      if (paidAt <= 0 || now - paidAt < FEEDBACK_DELAY_MS) {
        skipped += 1;
        continue;
      }
      const job = invoice.job_id
        ? await db.Job.get(invoice.job_id).catch(() => null)
        : null;
      if (
        !job || job.customer_account_id !== invoice.customer_account_id ||
        !job.completed_at
      ) {
        skipped += 1;
        continue;
      }
      const reserved = await reserveFeedbackEvent(db, invoice, job);
      if (reserved.created) queued += 1;
      else duplicates += 1;
    }

    const retention = await runRetentionCleanup(db, now);
    console.info("[processScheduledNotifications:retention]", JSON.stringify({
      request_id: id,
      deleted: retention.deleted,
      failed: retention.failed,
      policies: retention.policies.map((policy) => ({
        policy: policy.policy,
        status: policy.status,
        scanned: policy.scanned,
        deleted: policy.deleted,
        failed: policy.failed,
      })),
    }));

    const workerResponse = await base44.functions.invoke(
      "processNotificationOutbox",
      {},
    ).catch(() => null);
    const worker = workerResponse?.data?.data || workerResponse?.data || null;
    return ok({
      queued,
      duplicates,
      skipped,
      scanned: invoices.length,
      scan_limit: MAX_SCAN,
      queue_limit: MAX_QUEUE,
      retention,
      worker,
    }, id, queued ? 202 : 200);
  } catch (error) {
    console.error("[processScheduledNotifications]", JSON.stringify({
      request_id: id,
      code: "scheduled_notification_failed",
      message: clean(error?.message || error, 500),
    }));
    return fail(
      "internal_error",
      "Scheduled notifications could not be queued.",
      id,
      500,
    );
  }
});
