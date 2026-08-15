import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

const BUSINESS_NAME = "On The Run Electrics";
const FROM_EMAIL = "On The Run Electrics <info@ontherunelectrics.com.au>";
const DEFAULT_ORIGIN = "https://ontherunelectrics.com.au";
const MAX_EVENTS = 25;
const MAX_RETRIES = 5;
const RETRY_BASE_MINUTES = 5;
const FEEDBACK_VALID_DAYS = 30;
const EVENT_LEASE_MS = 5 * 60 * 1000;
const DELIVERY_LEASE_MS = 90 * 1000;
const PROVIDER_TIMEOUT_MS = 15 * 1000;
const MAX_LEASE_HISTORY = 50;
const encoder = new TextEncoder();

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

function escapeHtml(value) {
  return clean(value, 5000).replace(/[&<>'"]/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character]);
}

function canonicalOrigin() {
  const configured = clean(Deno.env.get("PUBLIC_APP_ORIGIN"), 500) ||
    DEFAULT_ORIGIN;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password) {
      return DEFAULT_ORIGIN;
    }
    return url.origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

function emailShell(content) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#172033"><header style="background:#0f766e;color:#fff;padding:20px;border-radius:12px 12px 0 0"><strong>${BUSINESS_NAME}</strong></header><main style="border:1px solid #d8dee9;border-top:0;padding:24px;border-radius:0 0 12px 12px">${content}</main><p style="font-size:12px;color:#64748b;text-align:center">Transactional service message from ${BUSINESS_NAME}.</p></body></html>`;
}

function button(href, label) {
  return `<p style="margin-top:24px"><a href="${
    escapeHtml(href)
  }" style="background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">${
    escapeHtml(label)
  }</a></p>`;
}

function money(invoice) {
  return `${escapeHtml(invoice.currency || "AUD")} ${
    (Number(invoice.amount) || 0).toFixed(2)
  }`;
}

function dateLabel(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

async function requireAdmin(base44) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return { error: "unauthorized", status: 401 };
  if (user.role !== "admin") return { error: "forbidden", status: 403 };
  return { user };
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/g,
    "",
  );
}

async function feedbackToken(eventKey) {
  const secret = Deno.env.get("FEEDBACK_TOKEN_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error("feedback_token_secret_missing");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(eventKey),
  );
  return base64url(new Uint8Array(signature));
}

async function ensureFeedbackInvitation(db, event, invoice, job) {
  const eventKey = `feedback:${invoice.id}:${
    invoice.paid_at || invoice.paid_date || invoice.updated_date
  }`;
  const rawToken = await feedbackToken(eventKey);
  const tokenHash = await sha256(rawToken);
  const existing = await db.FeedbackInvitation.filter(
    { event_key: eventKey },
    "-created_date",
    1,
  ).catch(() => []);
  if (!existing[0]) {
    try {
      await db.FeedbackInvitation.create({
        event_key: eventKey,
        token_hash: tokenHash,
        job_id: job.id,
        invoice_id: invoice.id,
        customer_account_id: job.customer_account_id ||
          invoice.customer_account_id || "",
        expires_at: new Date(
          Date.now() + FEEDBACK_VALID_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    } catch {
      const raced = await db.FeedbackInvitation.filter(
        { event_key: eventKey },
        "-created_date",
        1,
      ).catch(() => []);
      if (!raced[0]) throw new Error("feedback_invitation_create_failed");
    }
  }
  return {
    rawToken,
    link: `${canonicalOrigin()}/feedback?token=${encodeURIComponent(rawToken)}`,
  };
}

async function loadContext(db, event) {
  let invoice = null;
  let job = null;
  const invoiceId = event.related_entity_type === "Invoice"
    ? event.related_entity_id
    : event.event_data?.invoice_id;
  if (invoiceId) invoice = await db.Invoice.get(invoiceId).catch(() => null);
  const jobId = invoice?.job_id || event.job_id ||
    (event.related_entity_type === "Job"
      ? event.related_entity_id
      : event.event_data?.job_id);
  if (jobId) job = await db.Job.get(jobId).catch(() => null);
  return { invoice, job };
}

function contextMatches(event, invoice, job) {
  const expectedInvoiceId = event.related_entity_type === "Invoice"
    ? event.related_entity_id
    : event.event_data?.invoice_id;
  const expectedJobId = event.related_entity_type === "Job"
    ? event.related_entity_id
    : event.job_id || event.event_data?.job_id;
  if (expectedInvoiceId && invoice?.id !== expectedInvoiceId) return false;
  if (expectedJobId && job?.id !== expectedJobId) return false;
  if (invoice && job && invoice.job_id !== job.id) return false;
  if (
    invoice?.customer_account_id && job?.customer_account_id &&
    invoice.customer_account_id !== job.customer_account_id
  ) return false;
  const authoritativeCustomerId = job?.customer_account_id ||
    invoice?.customer_account_id || "";
  if (
    event.customer_account_id &&
    event.customer_account_id !== authoritativeCustomerId
  ) return false;
  return true;
}

function stateMatches(event, invoice, job) {
  if (!contextMatches(event, invoice, job)) return false;
  const type = eventType(event);
  if (type === "feedback_request") {
    return invoice?.status === "paid" && Boolean(job?.completed_at);
  }
  if (type === "invoice_issued") {
    return Boolean(job) && invoice?.invoiceVisibility === "customer_visible" &&
      ["issued", "outstanding"].includes(invoice?.status);
  }
  if (type === "invoice_reminder") {
    return Boolean(job) &&
      invoice?.last_payment_reminder_sent_date === event.event_version &&
      invoice?.invoiceVisibility === "customer_visible" &&
      ["issued", "outstanding"].includes(invoice?.status);
  }
  if (type === "invoice_paid") {
    return Boolean(job) && invoice?.status === "paid";
  }
  if (type === "booking_request") return job?.status === "requested";
  if (type === "job_scheduled") return job?.status === "scheduled";
  if (type === "repair_started") return job?.status === "repair_in_progress";
  if (type === "repair_completed") {
    return ["ready_for_pickup", "completed"].includes(job?.status);
  }
  return false;
}

function eventType(event) {
  return clean(event.event_key.split(":")[0], 80);
}

async function marketingAllowed(db, job, channel) {
  if (!job?.customer_account_id) return false;
  const customer = await db.Customer.get(job.customer_account_id).catch(() =>
    null
  );
  if (!customer?.user_id) return false;
  const preferences = await db.NotificationPreference.filter(
    { user_id: customer.user_id, event_key: "feedback_request", channel },
    "-updated_date",
    1,
  ).catch(() => []);
  return preferences[0]?.enabled === true &&
    preferences[0]?.consent_granted === true;
}

async function buildMessages(db, event, invoice, job) {
  const type = eventType(event);
  const origin = canonicalOrigin();
  const name = escapeHtml(job?.customer_name || "there");
  const ref = escapeHtml(job?.reference || invoice?.number || "");
  const portal = `${origin}/portal`;
  const messages = [];
  const addCustomer = (subject, html, sms) => {
    if (job?.customer_email) {
      messages.push({
        channel: "email",
        recipientType: "customer",
        address: clean(job.customer_email, 320).toLowerCase(),
        subject,
        body: emailShell(html),
        transactional: true,
      });
    }
    if (job?.customer_phone_e164 && sms) {
      messages.push({
        channel: "sms",
        recipientType: "customer",
        address: clean(job.customer_phone_e164, 40),
        body: sms,
        transactional: true,
      });
    }
  };

  if (type === "booking_request") {
    addCustomer(
      `Booking request received — ${ref}`,
      `<p>Hi ${name},</p><p>We received your repair booking request. We will contact you after it has been reviewed.</p><p><strong>Reference:</strong> ${ref}</p>${
        button(portal, "View your portal")
      }`,
      `We received your repair booking request. Reference: ${
        clean(job.reference, 80)
      }.`,
    );
  } else if (type === "job_scheduled") {
    const when = escapeHtml(dateLabel(job.scheduled_date));
    addCustomer(
      `Booking confirmed — ${ref}`,
      `<p>Hi ${name},</p><p>Your repair booking is confirmed${
        when ? ` for <strong>${when}</strong>` : ""
      }.</p>${button(portal, "View booking")}`,
      `Your repair booking is confirmed${when ? ` for ${when}` : ""}. Ref: ${
        clean(job.reference, 80)
      }.`,
    );
  } else if (type === "repair_started") {
    addCustomer(
      `Repair started — ${ref}`,
      `<p>Hi ${name},</p><p>Work has started on your repair. We will let you know when it is ready.</p>${
        button(portal, "View repair status")
      }`,
      `Work has started on your repair. Ref: ${clean(job.reference, 80)}.`,
    );
  } else if (type === "repair_completed") {
    addCustomer(
      `Repair ready for pickup — ${ref}`,
      `<p>Hi ${name},</p><p>Your repair is ready for pickup. Contact the workshop if you need to arrange collection.</p>${
        button(portal, "View repair status")
      }`,
      `Your repair is ready for pickup. Ref: ${clean(job.reference, 80)}.`,
    );
  } else if (type === "invoice_issued") {
    addCustomer(
      `Invoice ${escapeHtml(invoice.number || "")} — ${money(invoice)}`,
      `<p>Hi ${name},</p><p>Your invoice has been issued and is due on receipt.</p><p><strong>Amount:</strong> ${
        money(invoice)
      }</p>${button(portal, "View invoice")}`,
      `Invoice ${clean(invoice.number, 80)} for ${invoice.currency || "AUD"} ${
        (Number(invoice.amount) || 0).toFixed(2)
      } is due on receipt.`,
    );
  } else if (type === "invoice_reminder") {
    addCustomer(
      `Invoice reminder ${escapeHtml(invoice.number || "")} — ${
        money(invoice)
      }`,
      `<p>Hi ${name},</p><p>This is a reminder that your invoice remains outstanding and is due on receipt.</p><p><strong>Amount:</strong> ${
        money(invoice)
      }</p>${button(portal, "View invoice")}`,
      `Reminder: Invoice ${clean(invoice.number, 80)} for ${
        invoice.currency || "AUD"
      } ${(Number(invoice.amount) || 0).toFixed(2)} remains due on receipt.`,
    );
  } else if (type === "invoice_paid") {
    addCustomer(
      `Payment recorded — ${ref}`,
      `<p>Hi ${name},</p><p>Your manual payment of <strong>${
        money(invoice)
      }</strong> has been recorded. Thank you.</p>${
        button(portal, "View receipt status")
      }`,
      `Your payment of ${invoice.currency || "AUD"} ${
        (Number(invoice.amount) || 0).toFixed(2)
      } has been recorded. Ref: ${clean(job.reference, 80)}.`,
    );
  } else if (type === "feedback_request") {
    const invitation = await ensureFeedbackInvitation(db, event, invoice, job);
    if (job?.customer_email && await marketingAllowed(db, job, "email")) {
      messages.push({
        channel: "email",
        recipientType: "customer",
        address: clean(job.customer_email, 320).toLowerCase(),
        subject: `How did we do? — ${BUSINESS_NAME}`,
        body: emailShell(
          `<p>Hi ${name},</p><p>If you would like to, tell us about your recent repair.</p>${
            button(invitation.link, "Leave feedback")
          }`,
        ),
        transactional: false,
      });
    }
    if (job?.customer_phone_e164 && await marketingAllowed(db, job, "sms")) {
      messages.push({
        channel: "sms",
        recipientType: "customer",
        address: clean(job.customer_phone_e164, 40),
        body: `Tell us about your recent repair: ${invitation.link}`,
        transactional: false,
      });
    }
  }
  return messages;
}

function retryAt(attempt) {
  return new Date(
    Date.now() + RETRY_BASE_MINUTES * (2 ** Math.min(attempt, 5)) * 60 * 1000,
  ).toISOString();
}

function timestamp(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

async function acquireLease(db, resourceType, resourceId, ownerId, lifetimeMs) {
  const nowMs = Date.now();
  const leases = await db.NotificationWorkLease.filter(
    { resource_type: resourceType, resource_id: resourceId },
    "-sequence",
    MAX_LEASE_HISTORY,
  ).catch(() => []);
  const latest =
    leases.sort((left, right) =>
      Number(right.sequence || 0) - Number(left.sequence || 0)
    )[0] || null;
  if (latest?.status === "active" && timestamp(latest.expires_at) > nowMs) {
    return null;
  }

  const sequence =
    Math.max(0, ...leases.map((lease) => Number(lease.sequence) || 0)) + 1;
  const leaseKey = `${resourceType}:${resourceId}:${sequence}`;
  const acquiredAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + lifetimeMs).toISOString();
  try {
    const lease = await db.NotificationWorkLease.create({
      lease_key: leaseKey,
      resource_type: resourceType,
      resource_id: resourceId,
      sequence,
      owner_id: ownerId,
      status: "active",
      acquired_at: acquiredAt,
      expires_at: expiresAt,
    });
    if (latest?.status === "active") {
      await db.NotificationWorkLease.update(latest.id, {
        status: "expired",
        released_at: acquiredAt,
      }).catch(() => null);
    }
    return lease;
  } catch (error) {
    const raced = await db.NotificationWorkLease.filter(
      { lease_key: leaseKey },
      "-created_date",
      1,
    ).catch(() => []);
    if (raced[0]) return null;
    throw error;
  }
}

async function leaseIsCurrent(db, lease) {
  const current = await db.NotificationWorkLease.get(lease.id).catch(() =>
    null
  );
  if (
    !current || current.status !== "active" ||
    current.owner_id !== lease.owner_id ||
    timestamp(current.expires_at) <= Date.now()
  ) return false;
  const newest = await db.NotificationWorkLease.filter(
    { resource_type: lease.resource_type, resource_id: lease.resource_id },
    "-sequence",
    1,
  ).catch(() => []);
  return newest[0]?.id === lease.id &&
    Number(newest[0]?.sequence) === Number(lease.sequence);
}

async function releaseLease(db, lease) {
  await db.NotificationWorkLease.update(lease.id, {
    status: "released",
    released_at: new Date().toISOString(),
  }).catch(() => null);
}

async function finishEvent(db, event, lease, updates) {
  if (!await leaseIsCurrent(db, lease)) return false;
  await db.NotificationEvent.update(event.id, updates);
  await releaseLease(db, lease);
  return true;
}

function processingLeaseExpired(event) {
  return event.status !== "processing" ||
    timestamp(event.lease_expires_at) <= Date.now();
}

async function loadRecoverableEvents(db) {
  const [ready, processing] = await Promise.all([
    db.NotificationEvent.filter(
      { status: { $in: ["pending", "failed", "partially_processed"] } },
      "occurred_at",
      MAX_EVENTS,
    ).catch(() => []),
    db.NotificationEvent.filter(
      { status: "processing" },
      "occurred_at",
      MAX_EVENTS,
    ).catch(() => []),
  ]);
  return [
    ...new Map(
      [...ready, ...processing.filter(processingLeaseExpired)].map((
        event,
      ) => [event.id, event]),
    ).values(),
  ]
    .sort((left, right) =>
      timestamp(left.occurred_at || left.created_date) -
      timestamp(right.occurred_at || right.created_date)
    )
    .slice(0, MAX_EVENTS);
}

async function reserveDelivery(db, event, message) {
  const addressHash = await sha256(message.address.toLowerCase());
  const key = `${event.event_key}:${message.channel}:${message.recipientType}:${
    addressHash.slice(0, 16)
  }`;
  const existing = await db.NotificationDelivery.filter(
    { idempotency_key: key },
    "-created_date",
    1,
  ).catch(() => []);
  if (existing[0]) return existing[0];
  try {
    return await db.NotificationDelivery.create({
      event_key: event.event_key,
      notification_event_id: event.id,
      related_entity_type: event.related_entity_type,
      related_entity_id: event.related_entity_id,
      job_id: event.job_id || "",
      recipient_type: message.recipientType,
      recipient_address: message.address,
      channel: message.channel,
      template_reference: eventType(event),
      created_time: new Date().toISOString(),
      delivery_status: "queued",
      retry_count: 0,
      idempotency_key: key,
      delivery_mode: "automatic",
    });
  } catch {
    const raced = await db.NotificationDelivery.filter(
      { idempotency_key: key },
      "-created_date",
      1,
    ).catch(() => []);
    if (raced[0]) return raced[0];
    throw new Error("delivery_reservation_failed");
  }
}

async function sendEmail(config, message, delivery) {
  if (!config.resendKey) {
    return { status: "dead_letter", code: "email_not_configured" };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": delivery.idempotency_key,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [message.address],
      subject: message.subject,
      html: message.body,
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const responseBody = await response.json().catch(() => ({}));
  if (response.ok) {
    return {
      status: "sent",
      provider: "resend",
      providerId: clean(responseBody.id, 240),
    };
  }
  return {
    status: response.status === 429 || response.status >= 500
      ? "failed"
      : "dead_letter",
    code: `email_http_${response.status}`,
  };
}

async function sendSms(config, message) {
  if (!config.twilioSid || !config.twilioToken || !config.twilioFrom) {
    return { status: "dead_letter", code: "sms_not_configured" };
  }
  if (!/^\+[1-9]\d{7,14}$/.test(message.address)) {
    return { status: "dead_letter", code: "invalid_phone" };
  }
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${
            btoa(`${config.twilioSid}:${config.twilioToken}`)
          }`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: config.twilioFrom,
          To: message.address,
          Body: message.body,
        }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      },
    );
    const responseBody = await response.json().catch(() => ({}));
    if (response.ok) {
      return {
        status: "sent",
        provider: "twilio",
        providerId: clean(responseBody.sid, 240),
      };
    }
    return {
      status: response.status === 429
        ? "failed"
        : response.status >= 500
        ? "ambiguous"
        : "dead_letter",
      code: `sms_http_${response.status}`,
    };
  } catch {
    return { status: "ambiguous", code: "sms_network_ambiguous" };
  }
}

async function deliver(db, config, event, message, workerId) {
  let delivery = await reserveDelivery(db, event, message);
  if (
    [
      "sent",
      "delivered",
      "duplicate_prevented",
      "suppressed",
      "dead_letter",
      "ambiguous",
    ]
      .includes(delivery.delivery_status)
  ) return delivery.delivery_status;
  if (
    delivery.next_attempt_at &&
    new Date(delivery.next_attempt_at).getTime() > Date.now()
  ) return "deferred";

  const lease = await acquireLease(
    db,
    "delivery",
    delivery.id,
    workerId,
    DELIVERY_LEASE_MS,
  );
  if (!lease) return "deferred";

  try {
    delivery = await db.NotificationDelivery.get(delivery.id);
  } catch (error) {
    await releaseLease(db, lease);
    throw error;
  }
  if (
    [
      "sent",
      "delivered",
      "duplicate_prevented",
      "suppressed",
      "dead_letter",
      "ambiguous",
    ]
      .includes(delivery.delivery_status)
  ) {
    await releaseLease(db, lease);
    return delivery.delivery_status;
  }
  if (
    delivery.next_attempt_at &&
    new Date(delivery.next_attempt_at).getTime() > Date.now()
  ) {
    await releaseLease(db, lease);
    return "deferred";
  }
  const recoveringUnconfirmedSend = delivery.delivery_status === "sending";

  // Twilio has no idempotency-key contract equivalent to Resend. If a worker
  // died after entering `sending`, the provider outcome is unknowable; fail
  // closed as ambiguous instead of risking a duplicate SMS on recovery.
  if (recoveringUnconfirmedSend && message.channel === "sms") {
    if (!await leaseIsCurrent(db, lease)) return "deferred";
    await db.NotificationDelivery.update(delivery.id, {
      delivery_status: "ambiguous",
      failure_reason:
        "A prior SMS send was interrupted and cannot be retried safely.",
      last_error_code: "sms_recovery_ambiguous",
      dead_lettered_at: new Date().toISOString(),
      sending_lease_id: lease.id,
      sending_lease_sequence: lease.sequence,
      sending_owner_id: workerId,
      lease_expires_at: lease.expires_at,
    });
    await releaseLease(db, lease);
    return "ambiguous";
  }

  const sendingAt = new Date().toISOString();
  if (!await leaseIsCurrent(db, lease)) return "deferred";
  await db.NotificationDelivery.update(delivery.id, {
    delivery_status: "sending",
    sending_owner_id: workerId,
    sending_lease_id: lease.id,
    sending_lease_sequence: lease.sequence,
    sending_started_at: sendingAt,
    lease_expires_at: lease.expires_at,
  });
  if (!await leaseIsCurrent(db, lease)) return "deferred";
  let result;
  try {
    result = message.channel === "email"
      ? await sendEmail(config, message, delivery)
      : await sendSms(config, message);
  } catch {
    result = {
      status: message.channel === "sms" ? "ambiguous" : "failed",
      code: "provider_network_error",
    };
  }

  // With the configured provider timeout this should remain well inside the
  // lease. A suspended/stale worker must never overwrite the newer lease
  // owner's decision. Email recovery reuses the provider idempotency key; SMS
  // recovery becomes ambiguous rather than risking a duplicate send.
  if (!await leaseIsCurrent(db, lease)) {
    return "deferred";
  }
  const attempts = (Number(delivery.retry_count) || 0) + 1;
  const exhausted = result.status === "failed" && attempts >= MAX_RETRIES;
  const status = exhausted ? "dead_letter" : result.status;
  await db.NotificationDelivery.update(delivery.id, {
    delivery_status: status,
    provider: result.provider || "",
    provider_message_id: result.providerId || "",
    send_time: status === "sent" ? new Date().toISOString() : undefined,
    retry_count: attempts,
    failure_reason: status === "sent" ? "" : "Delivery was not confirmed.",
    last_error_code: result.code || "",
    next_attempt_at: status === "failed" ? retryAt(attempts) : "",
    dead_lettered_at: ["dead_letter", "ambiguous"].includes(status)
      ? new Date().toISOString()
      : "",
  });
  await releaseLease(db, lease);
  return status;
}

Deno.serve(async (req) => {
  const id = requestId(req);
  try {
    if (req.method !== "POST") {
      return fail("method_not_allowed", "Use POST for this action.", id, 405);
    }
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) {
      return fail(
        auth.error,
        auth.error === "unauthorized"
          ? "A trusted workflow or administrator session is required."
          : "Administrator access is required.",
        id,
        auth.status,
      );
    }
    const db = base44.asServiceRole.entities;
    const config = {
      resendKey: Deno.env.get("RESEND_API_KEY") || "",
      twilioSid: Deno.env.get("TWILIO_ACCOUNT_SID") || "",
      twilioToken: Deno.env.get("TWILIO_AUTH_TOKEN") || "",
      twilioFrom: Deno.env.get("TWILIO_FROM_NUMBER") || "",
    };
    const workerId = `${id}:${crypto.randomUUID()}`;
    const events = await loadRecoverableEvents(db);
    const summary = {
      examined: events.length,
      processed: 0,
      partial: 0,
      dead_letter: 0,
      skipped: 0,
      deliveries: 0,
      recovered: 0,
      leased_elsewhere: 0,
    };
    for (const event of events) {
      const lease = await acquireLease(
        db,
        "event",
        event.id,
        workerId,
        EVENT_LEASE_MS,
      );
      if (!lease) {
        summary.leased_elsewhere += 1;
        continue;
      }
      const currentEvent = await db.NotificationEvent.get(event.id).catch(() =>
        null
      );
      const recoverableStatus = currentEvent &&
        ["pending", "failed", "partially_processed"].includes(
          currentEvent.status,
        );
      const recoverableProcessing = currentEvent?.status === "processing" &&
        processingLeaseExpired(currentEvent);
      if (!recoverableStatus && !recoverableProcessing) {
        await releaseLease(db, lease);
        summary.leased_elsewhere += 1;
        continue;
      }
      const activeEvent = currentEvent;
      const recovering = activeEvent.status === "processing";
      let released = false;
      try {
        await db.NotificationEvent.update(activeEvent.id, {
          status: "processing",
          failure_reason: "",
          processing_owner_id: workerId,
          processing_lease_id: lease.id,
          processing_lease_sequence: lease.sequence,
          processing_started_at: new Date().toISOString(),
          lease_expires_at: lease.expires_at,
          processing_attempt_count:
            (Number(activeEvent.processing_attempt_count) || 0) + 1,
          ...(recovering
            ? { last_recovered_at: new Date().toISOString() }
            : {}),
        });
        if (recovering) summary.recovered += 1;

        const { invoice, job } = await loadContext(db, activeEvent);
        if (!stateMatches(activeEvent, invoice, job)) {
          released = await finishEvent(db, activeEvent, lease, {
            status: "dead_letter",
            failure_reason:
              "Authoritative entity state no longer matches the event.",
          });
          if (released) summary.dead_letter += 1;
          continue;
        }

        let messages;
        try {
          messages = await buildMessages(db, activeEvent, invoice, job);
        } catch (error) {
          released = await finishEvent(db, activeEvent, lease, {
            status: "failed",
            failure_reason: clean(error?.message || error, 1000),
          });
          if (released) summary.partial += 1;
          continue;
        }
        if (!messages.length) {
          released = await finishEvent(db, activeEvent, lease, {
            status: "processed",
            processed_at: new Date().toISOString(),
            failure_reason: "No consented or valid recipients.",
          });
          if (released) summary.skipped += 1;
          continue;
        }

        const statuses = [];
        for (const message of messages) {
          statuses.push(
            await deliver(db, config, activeEvent, message, workerId),
          );
          summary.deliveries += 1;
        }
        const completed = statuses.every((status) =>
          ["sent", "delivered", "duplicate_prevented", "suppressed"].includes(
            status,
          )
        );
        const terminal = statuses.every((status) =>
          [
            "sent",
            "delivered",
            "duplicate_prevented",
            "suppressed",
            "dead_letter",
            "ambiguous",
          ].includes(status)
        );
        released = await finishEvent(db, activeEvent, lease, {
          status: completed
            ? "processed"
            : terminal
            ? "dead_letter"
            : "partially_processed",
          processed_at: completed ? new Date().toISOString() : undefined,
          failure_reason: completed
            ? ""
            : "One or more recipient deliveries were not confirmed.",
        });
        if (released) {
          if (completed) summary.processed += 1;
          else if (terminal) summary.dead_letter += 1;
          else summary.partial += 1;
        }
      } catch (error) {
        released = await finishEvent(db, activeEvent, lease, {
          status: "failed",
          failure_reason: clean(error?.message || error, 1000),
        }).catch(() => false);
        if (released) summary.partial += 1;
      } finally {
        if (!released && await leaseIsCurrent(db, lease)) {
          await releaseLease(db, lease);
        }
      }
    }
    return ok(summary, id);
  } catch (error) {
    console.error(
      "[processNotificationOutbox]",
      JSON.stringify({
        request_id: id,
        code: "notification_worker_failed",
        message: clean(error?.message || error, 500),
      }),
    );
    return fail(
      "internal_error",
      "The notification queue could not be processed.",
      id,
      500,
    );
  }
});
