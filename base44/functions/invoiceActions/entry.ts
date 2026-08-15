import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

const CURRENCY = "AUD";
const INTERNAL = "internal";
const CUSTOMER_VISIBLE = "customer_visible";
const PAYMENT_METHODS = new Set(["cash", "eftpos", "bank_transfer", "other"]);
const INVOICE_STATES = new Set([
  "draft",
  "issued",
  "paid",
  "void",
  "refunded",
  "outstanding",
]);
const MAX_LINE_ITEMS = 200;

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

function clean(value, maxLength = 1000) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(
    0,
    maxLength,
  );
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function moneyMinor(value) {
  return Math.round((Number(value) || 0) * 100);
}

function brisbaneDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type) => parts.find((row) => row.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function normalizeLineItems(input) {
  const items = Array.isArray(input) ? input.slice(0, MAX_LINE_ITEMS) : [];
  return items.map((item) => {
    const qty = Math.max(0, Number(item.qty) || 0);
    const unitPrice = Math.max(
      0,
      Number(item.unit_price ?? item.customer_unit_price) || 0,
    );
    return {
      description: clean(item.description || "Line item", 500),
      qty,
      unit_price: roundMoney(unitPrice),
      customer_unit_price: roundMoney(unitPrice),
      customer_line_total: roundMoney(qty * unitPrice),
      internal_cost_price: roundMoney(
        Math.max(0, Number(item.internal_cost_price) || 0),
      ),
      markup_percentage: Number(item.markup_percentage) || 0,
      is_custom_misc_part: Boolean(item.is_custom_misc_part),
      staff_notes: clean(item.staff_notes, 1000),
      tax_rate: Number(item.tax_rate) || 0,
      discount_amount: roundMoney(
        Math.max(0, Number(item.discount_amount) || 0),
      ),
      kind: clean(item.kind || "item", 80),
      category: clean(item.category || item.kind || "item", 80),
      sku: clean(item.sku, 120),
      source_usage_id: clean(item.source_usage_id, 120),
    };
  });
}

function lineTotal(item) {
  const subtotal = (Number(item.qty) || 0) * (Number(item.unit_price) || 0);
  const tax = subtotal * ((Number(item.tax_rate) || 0) / 100);
  return Math.max(0, subtotal + tax - (Number(item.discount_amount) || 0));
}

function invoiceTotal(items) {
  return roundMoney(items.reduce((sum, item) => sum + lineTotal(item), 0));
}

async function requireAdmin(base44) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return { error: "unauthorized", status: 401 };
  if (user.role !== "admin") return { error: "forbidden", status: 403 };
  return { user };
}

async function getJob(base44, jobId) {
  return await base44.asServiceRole.entities.Job.get(jobId).catch(() => null);
}

async function getInvoice(base44, invoiceId, jobId) {
  const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId)
    .catch(() => null);
  return invoice && (!jobId || invoice.job_id === jobId) ? invoice : null;
}

async function audit(base44, user, request, input) {
  return await base44.asServiceRole.entities.AuditEvent.create({
    request_id: request,
    actor_user_id: user.id,
    actor_id: user.id,
    actor_name: clean(user.full_name, 160) || "Administrator",
    actor_role: "admin",
    action: input.action,
    event_type: input.event_type || input.action,
    subject_type: input.subject_type || "Invoice",
    subject_id: input.subject_id,
    job_id: input.job_id || "",
    customer_id: input.customer_id || "",
    outcome: input.outcome || "success",
    previous_value: input.previous_value == null
      ? ""
      : clean(input.previous_value, 500),
    new_value: input.new_value == null ? "" : clean(input.new_value, 500),
    summary: clean(input.summary, 1000),
    visibility: input.visibility || "internal",
  });
}

async function enqueueNotification(base44, input) {
  const existing = await base44.asServiceRole.entities.NotificationEvent.filter(
    { event_key: input.event_key },
    "-created_date",
    1,
  ).catch(() => []);
  if (existing[0]) return existing[0];
  return await base44.asServiceRole.entities.NotificationEvent.create({
    event_key: input.event_key,
    related_entity_type: input.related_entity_type,
    related_entity_id: input.related_entity_id,
    job_id: input.job_id || "",
    customer_id: input.customer_id || "",
    customer_account_id: input.customer_account_id || "",
    event_version: input.event_version,
    event_data: input.event_data || {},
    source: input.source || "manual",
    status: "pending",
    occurred_at: new Date().toISOString(),
  });
}

async function findOrCreateEffect(db, event, type, subjectType, subjectId) {
  const key = `${event.event_key}:${type}`;
  const found = await db.PaymentEffect.filter(
    { effect_key: key },
    "-created_date",
    1,
  ).catch(() => []);
  if (found[0]) return found[0];
  try {
    return await db.PaymentEffect.create({
      effect_key: key,
      payment_event_id: event.id,
      effect_type: type,
      subject_type: subjectType,
      subject_id: subjectId,
      status: "pending",
      attempt_count: 0,
    });
  } catch {
    const raced = await db.PaymentEffect.filter(
      { effect_key: key },
      "-created_date",
      1,
    ).catch(() => []);
    if (raced[0]) return raced[0];
    throw new Error(`Could not reserve ${type}`);
  }
}

async function applyEffect(db, event, type, subjectType, subjectId, operation) {
  const effect = await findOrCreateEffect(
    db,
    event,
    type,
    subjectType,
    subjectId,
  );
  if (effect.status === "applied") return { applied: true, replayed: true };
  const now = new Date().toISOString();
  await db.PaymentEffect.update(effect.id, {
    status: "applying",
    attempt_count: (Number(effect.attempt_count) || 0) + 1,
    last_attempt_at: now,
    last_error_code: "",
    last_error_message: "",
  });
  try {
    await operation();
    await db.PaymentEffect.update(effect.id, {
      status: "applied",
      applied_at: new Date().toISOString(),
    });
    return { applied: true, replayed: false };
  } catch (error) {
    await db.PaymentEffect.update(effect.id, {
      status: "failed",
      last_error_code: "projection_failed",
      last_error_message: clean(error?.message || error, 1000),
    }).catch(() => null);
    return { applied: false, error: clean(error?.message || error, 500) };
  }
}

async function rewardProjection(db, invoice, job, kind, occurredAt) {
  if (kind === "manual_refund") {
    const issued = await db.CustomerReward.filter(
      { source_invoice_id: invoice.id },
      "-created_date",
      100,
    ).catch(() => []);
    const conflicts = [];
    for (const reward of issued) {
      if (["available", "expired", "released"].includes(reward.status)) {
        await db.CustomerReward.update(reward.id, {
          status: "cancelled",
          released_at: occurredAt,
        });
      } else if (reward.status !== "cancelled") {
        conflicts.push(reward.id);
      }
    }
    if (conflicts.length) {
      throw new Error(
        "A reward issued by this payment has already been used and needs reconciliation.",
      );
    }
    return;
  }

  if (invoice.reward_id) {
    const reward = await db.CustomerReward.get(invoice.reward_id).catch(() =>
      null
    );
    if (
      reward && ["applied", "locked"].includes(reward.status) &&
      reward.applied_invoice_id === invoice.id
    ) {
      await db.CustomerReward.update(reward.id, {
        status: "redeemed",
        redeemed_at: occurredAt,
      });
    }
  }

  const customerId = job.customer_account_id || invoice.customer_account_id;
  if (!customerId) return;
  const customer = await db.Customer.get(customerId).catch(() => null);
  if (!customer) return;
  if (!customer.first_paid_invoice_id) {
    await db.Customer.update(customer.id, {
      first_paid_invoice_id: invoice.id,
      first_paid_invoice_at: occurredAt,
    });
  }
}

async function reconcilePayment(base44, user, request, event, invoice, job) {
  const db = base44.asServiceRole.entities;
  const isRefund = event.kind === "manual_refund";
  const now = event.occurred_at || new Date().toISOString();
  const projection = {
    invoice: await applyEffect(
      db,
      event,
      "invoice_projection",
      "Invoice",
      invoice.id,
      async () => {
        await db.Invoice.update(
          invoice.id,
          isRefund
            ? {
              status: "refunded",
              refunded_at: now,
              last_payment_event_id: event.id,
            }
            : {
              status: "paid",
              paid_at: now,
              paid_date: now,
              payment_provider: "manual",
              payment_method: event.method,
              payment_reference: event.reference || "",
              last_payment_event_id: event.id,
            },
        );
      },
    ),
    job: await applyEffect(
      db,
      event,
      "job_projection",
      "Job",
      job.id,
      async () => {
        await db.Job.update(
          job.id,
          isRefund
            ? {
              payment_status: "refunded",
            }
            : {
              payment_status: "paid",
              status: "completed",
              completed_at: job.completed_at || now,
            },
        );
      },
    ),
    audit: await applyEffect(
      db,
      event,
      "audit_projection",
      "AuditEvent",
      invoice.id,
      async () => {
        await audit(base44, user, request, {
          action: isRefund
            ? "manual_payment_refunded"
            : "manual_payment_recorded",
          subject_id: invoice.id,
          job_id: job.id,
          customer_id: invoice.customer_id || job.customer_id || "",
          previous_value: invoice.status || "",
          new_value: isRefund ? "refunded" : "paid",
          summary: `${
            isRefund ? "Manual refund recorded" : "Manual payment recorded"
          } (${CURRENCY} ${Math.abs(event.amount_minor / 100).toFixed(2)}, ${
            event.method || "other"
          })`,
          visibility: "customer",
        });
      },
    ),
    reward: await applyEffect(
      db,
      event,
      "reward_projection",
      "CustomerReward",
      invoice.id,
      async () => {
        await rewardProjection(db, invoice, job, event.kind, now);
      },
    ),
  };
  const complete = Object.values(projection).every((entry) => entry.applied);
  await db.PaymentEvent.update(event.id, {
    status: complete ? "complete" : "needs_reconciliation",
    failure_code: complete ? "" : "projection_incomplete",
    failure_message: complete
      ? ""
      : "One or more payment projections need reconciliation.",
  });
  const [currentInvoice, currentJob] = await Promise.all([
    db.Invoice.get(invoice.id).catch(() => null),
    db.Job.get(job.id).catch(() => null),
  ]);
  return { complete, projection, invoice: currentInvoice, job: currentJob };
}

async function recordPayment(base44, user, request, body, job, refund = false) {
  const invoice = await getInvoice(base44, clean(body.invoiceId, 120), job.id);
  if (!invoice) return { failure: ["not_found", "Invoice not found.", 404] };
  const expectedMinor =
    Number.isInteger(invoice.amount_minor) && invoice.amount_minor > 0
      ? invoice.amount_minor
      : moneyMinor(invoice.amount);
  const suppliedMinor = Number.isInteger(Number(body.amount_minor))
    ? Number(body.amount_minor)
    : moneyMinor(body.amount);
  const method = clean(body.method, 40);
  const eventKey = clean(body.idempotency_key, 200);
  if (!/^[A-Za-z0-9:_-]{8,200}$/.test(eventKey)) {
    return {
      failure: [
        "validation_error",
        "A valid idempotency key is required.",
        400,
      ],
    };
  }
  if (!PAYMENT_METHODS.has(method)) {
    return {
      failure: [
        "validation_error",
        "Choose cash, EFTPOS, bank transfer, or other.",
        400,
      ],
    };
  }
  if (expectedMinor <= 0 || suppliedMinor !== expectedMinor) {
    return {
      failure: [
        "amount_mismatch",
        "Only the exact full outstanding amount can be recorded.",
        409,
      ],
    };
  }
  if (!refund && !["issued", "outstanding"].includes(invoice.status)) {
    return {
      failure: ["invalid_state", "Only an issued invoice can be paid.", 409],
    };
  }
  if (refund && invoice.status !== "paid") {
    return {
      failure: ["invalid_state", "Only a paid invoice can be refunded.", 409],
    };
  }
  const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date();
  if (
    Number.isNaN(occurredAt.getTime()) ||
    occurredAt.getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return {
      failure: ["validation_error", "Choose a valid payment time.", 400],
    };
  }

  const db = base44.asServiceRole.entities;
  const existing = await db.PaymentEvent.filter(
    { event_key: eventKey },
    "-created_date",
    1,
  ).catch(() => []);
  let event = existing[0] || null;
  const kind = refund ? "manual_refund" : "manual_payment";
  if (
    event &&
    (event.invoice_id !== invoice.id || event.kind !== kind ||
      Math.abs(event.amount_minor) !== expectedMinor)
  ) {
    return {
      failure: [
        "idempotency_conflict",
        "That payment key was already used for another operation.",
        409,
      ],
    };
  }
  if (!event) {
    try {
      event = await db.PaymentEvent.create({
        event_key: eventKey,
        invoice_id: invoice.id,
        job_id: job.id,
        customer_account_id: invoice.customer_account_id ||
          job.customer_account_id || "",
        kind,
        amount_minor: refund ? -expectedMinor : expectedMinor,
        currency: CURRENCY,
        method,
        reference: clean(body.reference, 200),
        occurred_at: occurredAt.toISOString(),
        recorded_by_user_id: user.id,
        recorded_by_name: clean(user.full_name, 160) || "Administrator",
        status: "pending",
        request_id: request,
      });
    } catch {
      const raced = await db.PaymentEvent.filter(
        { event_key: eventKey },
        "-created_date",
        1,
      ).catch(() => []);
      event = raced[0] || null;
      if (!event) throw new Error("Could not reserve the payment event.");
    }
  }
  const reconciliation = await reconcilePayment(
    base44,
    user,
    request,
    event,
    invoice,
    job,
  );
  if (!refund && reconciliation.complete) {
    const paidVersion = clean(
      event.occurred_at || new Date().toISOString(),
      100,
    );
    await enqueueNotification(base44, {
      event_key: `invoice_paid:${invoice.id}:${paidVersion}`,
      related_entity_type: "Invoice",
      related_entity_id: invoice.id,
      job_id: job.id,
      customer_id: invoice.customer_id || job.customer_id || "",
      customer_account_id: invoice.customer_account_id ||
        job.customer_account_id || "",
      event_version: paidVersion,
      event_data: { invoice_id: invoice.id },
      source: "manual",
    }).catch(() => null);
  }
  return {
    event: {
      id: event.id,
      event_key: event.event_key,
      kind: event.kind,
      status: reconciliation.complete ? "complete" : "needs_reconciliation",
    },
    reconciliation,
  };
}

Deno.serve(async (req) => {
  const request = requestId(req);
  try {
    if (req.method !== "POST") {
      return fail(
        "method_not_allowed",
        "Use POST for this action.",
        request,
        405,
      );
    }
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) {
      return fail(
        auth.error,
        auth.error === "unauthorized"
          ? "Sign in to continue."
          : "Administrator access is required.",
        request,
        auth.status,
      );
    }
    const body = await req.json().catch(() => ({}));
    const action = clean(body.action, 60);
    const jobId = clean(body.jobId, 120);
    if (!action || !jobId) {
      return fail(
        "validation_error",
        "action and jobId are required.",
        request,
        400,
      );
    }
    const job = await getJob(base44, jobId);
    if (!job) return fail("not_found", "Job not found.", request, 404);
    const db = base44.asServiceRole.entities;

    if (action === "create") {
      const lineItems = normalizeLineItems(body.lineItems);
      const amount = invoiceTotal(lineItems) || roundMoney(body.amount);
      if (amount <= 0) {
        return fail(
          "validation_error",
          "Invoice amount must be greater than zero.",
          request,
          400,
        );
      }
      const invoice = await db.Invoice.create({
        job_id: job.id,
        customer_account_id: job.customer_account_id || "",
        customer_id: job.customer_id || "",
        number: `INV-${Date.now().toString().slice(-8)}`,
        amount,
        amount_minor: moneyMinor(amount),
        currency: CURRENCY,
        status: "draft",
        invoiceVisibility: INTERNAL,
        line_items: lineItems,
        internalCostingNotes: clean(body.internalCostingNotes, 5000),
      });
      await db.Job.update(job.id, {
        invoice_id: invoice.id,
        payment_status: "draft",
      });
      await audit(base44, auth.user, request, {
        action: "invoice_created",
        subject_id: invoice.id,
        job_id: job.id,
        customer_id: job.customer_id,
        summary: `Draft invoice created (${CURRENCY} ${amount.toFixed(2)})`,
      });
      return ok({ invoice }, request, 201);
    }

    if (action === "update_line_items") {
      const invoice = await getInvoice(
        base44,
        clean(body.invoiceId, 120),
        job.id,
      );
      if (!invoice) {
        return fail("not_found", "Invoice not found.", request, 404);
      }
      if (invoice.status !== "draft") {
        return fail(
          "invalid_state",
          "Issued invoices cannot be edited.",
          request,
          409,
        );
      }
      const lineItems = normalizeLineItems(body.lineItems);
      const amount = invoiceTotal(lineItems);
      const updated = await db.Invoice.update(invoice.id, {
        line_items: lineItems,
        amount,
        amount_minor: moneyMinor(amount),
        internalCostingNotes: clean(body.internalCostingNotes, 5000),
        customer_notes: clean(body.customerNotes, 5000),
      });
      await audit(base44, auth.user, request, {
        action: "invoice_updated",
        subject_id: invoice.id,
        job_id: job.id,
        customer_id: job.customer_id,
        summary: "Draft invoice line items updated.",
      });
      return ok({ invoice: updated }, request);
    }

    if (action === "add_parts_to_invoice") {
      const invoiceId = clean(body.invoiceId || job.invoice_id, 120);
      const invoice = await getInvoice(base44, invoiceId, job.id);
      if (!invoice) {
        return fail("not_found", "Create an invoice first.", request, 404);
      }
      if (invoice.status !== "draft") {
        return fail(
          "invalid_state",
          "Issued invoices cannot be edited.",
          request,
          409,
        );
      }
      const usageIds: string[] = Array.isArray(body.usageIds)
        ? [
          ...new Set<string>(
            body.usageIds.map((id: unknown) => clean(id, 120)).filter(Boolean),
          ),
        ].slice(0, 100)
        : [];
      if (!usageIds.length) {
        return fail(
          "validation_error",
          "Select at least one part.",
          request,
          400,
        );
      }
      const usages = await Promise.all(
        usageIds.map((id) => db.InventoryUsage.get(id).catch(() => null)),
      );
      const valid = usages.filter((row) => row && row.job_id === job.id);
      const existingKeys = new Set(
        (invoice.line_items || []).map((item) => item.source_usage_id).filter(
          Boolean,
        ),
      );
      const parts = valid.filter((row) => !existingKeys.has(row.id)).map((
        row,
      ) => ({
        description: row.item_name || "Part",
        qty: Number(row.qty_used) || 1,
        unit_price: Number(row.unit_sell) ||
          roundMoney((Number(row.unit_cost) || 0) * 1.2),
        internal_cost_price: Number(row.unit_cost) || 0,
        markup_percentage: Number(row.markup_percentage) || 20,
        is_custom_misc_part: Boolean(row.is_custom_misc_part),
        staff_notes: row.note || "",
        kind: "part",
        sku: row.product_sku || row.item_id || "",
        source_usage_id: row.id,
      }));
      if (!parts.length) {
        return fail(
          "conflict",
          "Those parts are already on the invoice.",
          request,
          409,
        );
      }
      const lineItems = normalizeLineItems([
        ...(invoice.line_items || []),
        ...parts,
      ]);
      const amount = invoiceTotal(lineItems);
      const updated = await db.Invoice.update(invoice.id, {
        line_items: lineItems,
        amount,
        amount_minor: moneyMinor(amount),
      });
      await Promise.all(
        valid.map((usage) =>
          db.InventoryUsage.update(usage.id, { invoice_id: invoice.id })
        ),
      );
      return ok({ invoice: updated, added_count: parts.length }, request);
    }

    if (action === "send_to_customer" || action === "set_visibility") {
      const invoice = await getInvoice(
        base44,
        clean(body.invoiceId, 120),
        job.id,
      );
      if (!invoice) {
        return fail("not_found", "Invoice not found.", request, 404);
      }
      if (
        action === "set_visibility" &&
        body.invoiceVisibility !== CUSTOMER_VISIBLE
      ) {
        if (invoice.status !== "draft") {
          return fail(
            "invalid_state",
            "An issued invoice cannot be returned to draft.",
            request,
            409,
          );
        }
        const updated = await db.Invoice.update(invoice.id, {
          invoiceVisibility: INTERNAL,
        });
        return ok({ invoice: updated }, request);
      }
      if (
        invoice.status !== "draft" && invoice.status !== "outstanding" &&
        invoice.status !== "issued"
      ) {
        return fail(
          "invalid_state",
          "This invoice cannot be issued.",
          request,
          409,
        );
      }
      const issuedAt = invoice.issued_at || invoice.invoiceSentAt ||
        new Date().toISOString();
      const updated = await db.Invoice.update(invoice.id, {
        status: "issued",
        invoiceVisibility: CUSTOMER_VISIBLE,
        issued_at: issuedAt,
        due_date: invoice.due_date || brisbaneDate(new Date(issuedAt)),
        invoiceSentAt: invoice.invoiceSentAt || issuedAt,
        invoiceVisibleAt: invoice.invoiceVisibleAt || issuedAt,
      });
      await db.Job.update(job.id, {
        payment_status: "issued",
        status: "invoice_outstanding",
      });
      await enqueueNotification(base44, {
        event_key: `invoice_issued:${invoice.id}:${issuedAt}`,
        related_entity_type: "Invoice",
        related_entity_id: invoice.id,
        job_id: job.id,
        customer_id: job.customer_id || "",
        customer_account_id: job.customer_account_id || "",
        event_version: issuedAt,
        event_data: { invoice_id: invoice.id },
        source: "manual",
      });
      await audit(base44, auth.user, request, {
        action: "invoice_issued",
        subject_id: invoice.id,
        job_id: job.id,
        customer_id: job.customer_id,
        summary: "Invoice issued to customer and due on receipt.",
        visibility: "customer",
      });
      await base44.functions.invoke("processNotificationOutbox", {}).catch(() =>
        null
      );
      return ok({ invoice: updated }, request);
    }

    if (action === "record_manual_payment" || action === "set_payment_status") {
      if (action === "set_payment_status" && body.status !== "paid") {
        return fail(
          "retired_action",
          "Use record_manual_payment or record_manual_refund.",
          request,
          410,
        );
      }
      const result = await recordPayment(
        base44,
        auth.user,
        request,
        body,
        job,
        false,
      );
      if (result.failure) {
        return fail(
          result.failure[0],
          result.failure[1],
          request,
          result.failure[2],
        );
      }
      if (result.reconciliation.complete) {
        await base44.functions.invoke("processNotificationOutbox", {}).catch(
          () => null,
        );
      }
      return ok(result, request, result.reconciliation.complete ? 200 : 202);
    }

    if (action === "record_manual_refund") {
      const result = await recordPayment(
        base44,
        auth.user,
        request,
        body,
        job,
        true,
      );
      if (result.failure) {
        return fail(
          result.failure[0],
          result.failure[1],
          request,
          result.failure[2],
        );
      }
      return ok(result, request, result.reconciliation.complete ? 200 : 202);
    }

    if (action === "void") {
      const invoice = await getInvoice(
        base44,
        clean(body.invoiceId, 120),
        job.id,
      );
      if (!invoice) {
        return fail("not_found", "Invoice not found.", request, 404);
      }
      if (!["draft", "issued", "outstanding"].includes(invoice.status)) {
        return fail(
          "invalid_state",
          "Paid or refunded invoices cannot be voided.",
          request,
          409,
        );
      }
      const updated = await db.Invoice.update(invoice.id, {
        status: "void",
        voided_at: new Date().toISOString(),
        invoiceVisibility: INTERNAL,
      });
      await audit(base44, auth.user, request, {
        action: "invoice_voided",
        subject_id: invoice.id,
        job_id: job.id,
        customer_id: job.customer_id,
        summary: "Invoice voided.",
      });
      return ok({ invoice: updated }, request);
    }

    if (action === "send_reminder") {
      const invoice = await getInvoice(
        base44,
        clean(body.invoiceId, 120),
        job.id,
      );
      if (!invoice) {
        return fail("not_found", "Invoice not found.", request, 404);
      }
      if (!["issued", "outstanding"].includes(invoice.status)) {
        return fail(
          "invalid_state",
          "Only an unpaid issued invoice can receive a reminder.",
          request,
          409,
        );
      }
      const version = new Date().toISOString();
      await enqueueNotification(base44, {
        event_key: `invoice_reminder:${invoice.id}:${version}`,
        related_entity_type: "Invoice",
        related_entity_id: invoice.id,
        job_id: job.id,
        customer_id: job.customer_id || "",
        customer_account_id: job.customer_account_id || "",
        event_version: version,
        event_data: { invoice_id: invoice.id },
        source: "manual",
      });
      const updated = await db.Invoice.update(invoice.id, {
        last_payment_reminder_sent_date: version,
        payment_reminder_count: (Number(invoice.payment_reminder_count) || 0) +
          1,
      });
      await base44.functions.invoke("processNotificationOutbox", {}).catch(() =>
        null
      );
      return ok({ invoice: updated, queued: true }, request, 202);
    }

    return fail(
      "unknown_action",
      "That invoice action is not supported.",
      request,
      400,
    );
  } catch (error) {
    console.error(
      "[invoiceActions]",
      JSON.stringify({
        request_id: request,
        code: "invoice_action_failed",
        message: clean(error?.message || error, 500),
      }),
    );
    return fail(
      "internal_error",
      "The invoice request could not be completed.",
      request,
      500,
    );
  }
});
