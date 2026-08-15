import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

const JOB_UPDATE_EVENTS = new Map([
  ["scheduled", "job_scheduled"],
  ["repair_in_progress", "repair_started"],
  ["ready_for_pickup", "repair_completed"],
]);

function requestId(req) {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

function ok(data, id, status = 200) {
  return Response.json({ ok: true, data, request_id: id }, { status });
}

function fail(code, message, id, status) {
  return Response.json(
    { ok: false, error: { code, message }, request_id: id },
    { status },
  );
}

function clean(value, maxLength = 240) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(
    0,
    maxLength,
  );
}

function automationsEnabled() {
  return Deno.env.get("AUTOMATIONS_ENABLED") === "true";
}

async function requireTrustedPrincipal(base44) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return { error: "unauthorized", status: 401 };
  // Base44 automations run as the user who created them. The automation must be
  // created by the durable admin operator account; never depend on the user who
  // caused the entity event because that identity is not present in the hook.
  if (user.role !== "admin") return { error: "forbidden", status: 403 };
  return { user };
}

function skipped(reason) {
  return { skipped: true, reason };
}

function eventVersion(snapshot, current) {
  return clean(
    snapshot?.updated_date || snapshot?.created_date || current?.updated_date ||
      current?.created_date || Date.now(),
    100,
  );
}

function eventRecord(type, entityType, current, version) {
  return {
    eventType: type,
    entityType,
    entityId: current.id,
    jobId: entityType === "Job" ? current.id : current.job_id || "",
    customerId: current.customer_id || "",
    customerAccountId: current.customer_account_id || "",
    version,
    data: entityType === "Job"
      ? { job_id: current.id }
      : { invoice_id: current.id },
  };
}

async function authoritativeAutomationEvent(db, body) {
  const hook = body.event || {};
  const entityName = clean(hook.entity_name, 80);
  const entityId = clean(hook.entity_id, 120);
  const hookType = clean(hook.type, 20);
  const snapshot = body.data && typeof body.data === "object" ? body.data : null;
  const previous = body.old_data && typeof body.old_data === "object"
    ? body.old_data
    : null;

  if (!entityId || !["create", "update"].includes(hookType)) {
    return {
      error: "validation_error",
      message: "A supported entity automation payload is required.",
      status: 400,
    };
  }

  if (entityName === "Job") {
    // Always reload so decisions are based on the current server record. For an
    // oversized update payload old_data cannot be recovered, so transition
    // notification is deliberately skipped after this authoritative reload.
    const job = await db.Job.get(entityId).catch(() => null);
    if (!job) {
      return { error: "not_found", message: "Job not found.", status: 404 };
    }
    if (hookType === "create") {
      if (snapshot?.status && snapshot.status !== job.status) {
        return skipped("authoritative_state_advanced");
      }
      if (job.status !== "requested") return skipped("create_not_notifiable");
      return eventRecord(
        "booking_request",
        "Job",
        job,
        eventVersion(snapshot, job),
      );
    }
    if (body.payload_too_large === true || !snapshot || !previous) {
      return skipped("transition_unverifiable");
    }
    if (snapshot.status === previous.status) return skipped("unrelated_update");
    const type = JOB_UPDATE_EVENTS.get(snapshot.status);
    if (!type) return skipped("transition_not_notifiable");
    if (job.status !== snapshot.status) {
      return skipped("authoritative_state_advanced");
    }
    return eventRecord(type, "Job", job, eventVersion(snapshot, job));
  }

  if (entityName === "Invoice" && hookType === "update") {
    const invoice = await db.Invoice.get(entityId).catch(() => null);
    if (!invoice) {
      return { error: "not_found", message: "Invoice not found.", status: 404 };
    }
    if (body.payload_too_large === true || !snapshot || !previous) {
      return skipped("transition_unverifiable");
    }
    const currentVisibility = snapshot.invoiceVisibility;
    const previousVisibility = previous.invoiceVisibility;
    const paidTransition = snapshot.status === "paid" &&
      previous.status !== "paid";
    const visibleIssued = currentVisibility === "customer_visible" &&
      ["issued", "outstanding"].includes(snapshot.status);
    const issuedTransition = visibleIssued &&
      (previousVisibility !== "customer_visible" ||
        !["issued", "outstanding"].includes(previous.status));
    if (!paidTransition && !issuedTransition) return skipped("unrelated_update");
    if (
      invoice.status !== snapshot.status ||
      invoice.invoiceVisibility !== currentVisibility
    ) return skipped("authoritative_state_advanced");
    const type = paidTransition ? "invoice_paid" : "invoice_issued";
    return eventRecord(type, "Invoice", invoice, eventVersion(snapshot, invoice));
  }

  return skipped("unsupported_automation_event");
}

async function authoritativeManualEvent(db, body) {
  const requestedType = clean(body.event_type, 80);
  if (body.job_id) {
    const job = await db.Job.get(clean(body.job_id, 120)).catch(() => null);
    if (!job) {
      return { error: "not_found", message: "Job not found.", status: 404 };
    }
    const expected = job.status === "requested"
      ? "booking_request"
      : JOB_UPDATE_EVENTS.get(job.status);
    if (!expected || requestedType !== expected) {
      return {
        error: "state_mismatch",
        message: "The requested notification does not match the current job state.",
        status: 409,
      };
    }
    return eventRecord(expected, "Job", job, eventVersion(null, job));
  }
  if (body.invoice_id) {
    const invoice = await db.Invoice.get(clean(body.invoice_id, 120)).catch(() =>
      null
    );
    if (!invoice) {
      return { error: "not_found", message: "Invoice not found.", status: 404 };
    }
    const expected = invoice.status === "paid"
      ? "invoice_paid"
      : invoice.invoiceVisibility === "customer_visible" &&
          ["issued", "outstanding"].includes(invoice.status)
      ? "invoice_issued"
      : "";
    if (!expected || requestedType !== expected) {
      return {
        error: "state_mismatch",
        message: "The requested notification does not match the current invoice state.",
        status: 409,
      };
    }
    return eventRecord(expected, "Invoice", invoice, eventVersion(null, invoice));
  }
  return {
    error: "validation_error",
    message: "An allowed Job or Invoice reference is required.",
    status: 400,
  };
}

async function authoritativeEvent(base44, body) {
  const db = base44.asServiceRole.entities;
  return body.event
    ? await authoritativeAutomationEvent(db, body)
    : await authoritativeManualEvent(db, body);
}

Deno.serve(async (req) => {
  const id = requestId(req);
  try {
    if (req.method !== "POST") {
      return fail("method_not_allowed", "Use POST for this action.", id, 405);
    }
    if (!automationsEnabled()) {
      return fail(
        "automation_disabled",
        "Notification automations are disabled.",
        id,
        503,
      );
    }
    const base44 = createClientFromRequest(req);
    const principal = await requireTrustedPrincipal(base44);
    if (principal.error) {
      return fail(
        principal.error,
        principal.error === "unauthorized"
          ? "A trusted workflow or administrator session is required."
          : "Administrator access is required.",
        id,
        principal.status,
      );
    }
    const body = await req.json().catch(() => ({}));
    const event = await authoritativeEvent(base44, body);
    if (event.error) return fail(event.error, event.message, id, event.status);
    if (event.skipped) {
      return ok({ queued: false, skipped: true, reason: event.reason }, id);
    }

    const eventKey = `${event.eventType}:${event.entityId}:${event.version}`;
    const events = base44.asServiceRole.entities.NotificationEvent;
    const existing = await events.filter(
      { event_key: eventKey },
      "-created_date",
      1,
    ).catch(() => []);
    if (existing[0]) {
      return ok({
        event_id: existing[0].id,
        event_key: eventKey,
        queued: false,
        duplicate: true,
      }, id);
    }

    let record;
    try {
      record = await events.create({
        event_key: eventKey,
        related_entity_type: event.entityType,
        related_entity_id: event.entityId,
        job_id: event.jobId,
        customer_id: event.customerId,
        customer_account_id: event.customerAccountId,
        event_version: event.version,
        event_data: event.data,
        source: "automatic",
        status: "pending",
        occurred_at: new Date().toISOString(),
      });
    } catch {
      const raced = await events.filter(
        { event_key: eventKey },
        "-created_date",
        1,
      ).catch(() => []);
      record = raced[0] || null;
      if (!record) throw new Error("Could not reserve the notification event.");
    }
    const workerResponse = await base44.functions.invoke(
      "processNotificationOutbox",
      {},
    ).catch(() => null);
    return ok({
      event_id: record.id,
      event_key: eventKey,
      queued: true,
      worker: workerResponse?.data?.data || workerResponse?.data || null,
    }, id, 202);
  } catch (error) {
    console.error("[sendNotification]", JSON.stringify({
      request_id: id,
      code: "notification_enqueue_failed",
      message: clean(error?.message || error, 500),
    }));
    return fail("internal_error", "The notification could not be queued.", id, 500);
  }
});
