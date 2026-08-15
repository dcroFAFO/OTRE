import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

const DEFAULT_PERMISSIONS = [
  "view_status",
  "view_booking",
  "view_invoice",
  "view_files",
  "add_note",
  "upload_file",
];
const ALLOWED_PERMISSIONS = new Set(DEFAULT_PERMISSIONS);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const COMPLETION_ACCESS_DAYS = 30;
const SIGNED_URL_SECONDS = 120;
const INVALID_LINK =
  "This tracking link is not valid. Please check the link or contact On The Run Electrics for help.";
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

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function makeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hasPermission(access, permission) {
  return Array.isArray(access.permissions) &&
    access.permissions.includes(permission);
}

function effectiveExpiry(access, job) {
  const expiries = [];
  const explicit = access.expires_at || access.expiresAt;
  if (explicit) {
    const explicitTime = new Date(explicit).getTime();
    if (!Number.isFinite(explicitTime)) return 0;
    expiries.push(explicitTime);
  }
  const completedAt = job.completed_at;
  if (completedAt) {
    const completedTime = new Date(completedAt).getTime();
    if (!Number.isFinite(completedTime)) return 0;
    const configuredDays = Number(access.expires_after_completion_days);
    const days = Number.isFinite(configuredDays) && configuredDays > 0
      ? Math.min(configuredDays, COMPLETION_ACCESS_DAYS)
      : COMPLETION_ACCESS_DAYS;
    expiries.push(completedTime + days * 24 * 60 * 60 * 1000);
  }
  if (!completedAt && job.status === "completed") return 0;
  return expiries.filter(Number.isFinite).sort((a, b) => a - b)[0] || null;
}

async function validAccess(base44, rawToken) {
  if (!rawToken || rawToken.length < 32 || rawToken.length > 256) return null;
  const tokenHash = await sha256(rawToken);
  const records = await base44.asServiceRole.entities.PublicJobAccess.filter(
    { tokenHash },
    "-created_date",
    1,
  ).catch(() => []);
  const access = records[0] || null;
  if (!access || access.revoked_at || access.revokedAt) return null;
  const job = await base44.asServiceRole.entities.Job.get(
    access.job_id || access.jobId,
  ).catch(() => null);
  if (!job) return null;
  const expiry = effectiveExpiry(access, job);
  if (expiry !== null && expiry <= Date.now()) return null;
  await base44.asServiceRole.entities.PublicJobAccess.update(access.id, {
    last_used_at: new Date().toISOString(),
  }).catch(() => null);
  return { access, job };
}

function publicBooking(job) {
  return {
    id: job.id,
    reference: job.reference || "",
    source: job.source || "staff_created",
    asset_label: job.asset_label || job.scooter_details || "",
    issue_description: job.issue_description || job.issueDescription || "",
    scheduled_date: job.scheduled_date || null,
    preferred_time_window: job.preferred_time_window || null,
    created_date: job.created_date,
  };
}

function publicInvoice(invoice) {
  if (
    !invoice || invoice.invoiceVisibility !== "customer_visible" ||
    !["issued", "outstanding", "paid", "refunded"].includes(invoice.status)
  ) return null;
  return {
    id: invoice.id,
    number: invoice.number || "",
    amount: Number(invoice.amount) || 0,
    amount_minor: Number(invoice.amount_minor) ||
      Math.round((Number(invoice.amount) || 0) * 100),
    currency: invoice.currency || "AUD",
    status: invoice.status === "outstanding" ? "issued" : invoice.status,
    issued_at: invoice.issued_at || invoice.invoiceSentAt || null,
    due_date: invoice.due_date || null,
    paid_at: invoice.paid_at || invoice.paid_date || null,
    refunded_at: invoice.refunded_at || null,
    customer_notes: invoice.customer_notes || "",
    line_items: (invoice.line_items || []).map((item) => ({
      description: item.description || "Line item",
      qty: Number(item.qty) || 0,
      unit_price: Number(item.unit_price) || 0,
      tax_rate: Number(item.tax_rate) || 0,
      discount_amount: Number(item.discount_amount) || 0,
      kind: item.kind || "item",
      sku: item.sku || "",
    })),
  };
}

function attachmentDto(record) {
  return {
    id: record.id,
    file_name: record.file_name || "File",
    file_size: record.file_size || 0,
    mime_type: record.mime_type || "application/octet-stream",
    kind: record.kind || "document",
    created_date: record.created_date,
    downloadable: record.storage === "private" && Boolean(record.file_uri),
  };
}

async function listVisibleAttachments(base44, job, limit = 101) {
  return await base44.asServiceRole.entities.Attachment.filter(
    { job_id: job.id, visibility: "customer" },
    "-created_date",
    limit,
  ).catch(() => []);
}

async function payload(base44, job, access) {
  const canViewStatus = hasPermission(access, "view_status");
  const canViewBooking = hasPermission(access, "view_booking");
  const canViewFiles = hasPermission(access, "view_files");
  const [invoices, notes, attachments] = await Promise.all([
    hasPermission(access, "view_invoice")
      ? base44.asServiceRole.entities.Invoice.filter(
        { job_id: job.id },
        "-created_date",
        11,
      ).catch(() => [])
      : [],
    canViewBooking
      ? base44.asServiceRole.entities.JobNote.filter(
        { job_id: job.id, visibility: "customer" },
        "-created_date",
        101,
      ).catch(() => [])
      : [],
    canViewFiles ? listVisibleAttachments(base44, job) : [],
  ]);
  const visibleInvoice = invoices.find((invoice) => publicInvoice(invoice)) ||
    null;
  return {
    job: {
      ...(canViewStatus
        ? {
          id: job.id,
          reference: job.reference || "",
          status: job.status,
          completed_at: job.completed_at || null,
          updated_date: job.updated_date,
        }
        : {}),
      ...(canViewBooking ? publicBooking(job) : {}),
    },
    invoice: hasPermission(access, "view_invoice")
      ? publicInvoice(visibleInvoice)
      : null,
    notes: notes.slice(0, 100).map((note) => ({
      id: note.id,
      body: note.body,
      author_name: note.author_name,
      created_date: note.created_date,
    })),
    attachments: attachments.slice(0, 100).filter((item) => !item.archived_at)
      .map(attachmentDto),
    permissions: (access.permissions || []).filter((permission) =>
      ALLOWED_PERMISSIONS.has(permission)
    ),
    limits: { invoices: 10, notes: 100, attachments: 100 },
    truncation: {
      invoices: invoices.length > 10,
      notes: notes.length > 100,
      attachments: attachments.length > 100,
    },
  };
}

async function requireAdmin(base44) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return { error: "unauthorized", status: 401 };
  if (user.role !== "admin") return { error: "forbidden", status: 403 };
  return { user };
}

function validPrivateUri(value) {
  const uri = clean(value, 2000);
  return /^private\/[A-Za-z0-9._~!$&'()+,;=:@%/-]{1,1900}$/.test(uri) &&
    !uri.includes("..") && !uri.includes("\\") && !uri.includes("//");
}

function safeSignedUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  const id = requestId(req);
  try {
    if (req.method !== "POST") {
      return fail("method_not_allowed", "Use POST for this action.", id, 405);
    }
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = clean(body.action, 60);

    if (action === "staff_generate") {
      const auth = await requireAdmin(base44);
      if (auth.error) {
        return fail(
          auth.error,
          auth.error === "unauthorized"
            ? "Sign in to continue."
            : "Administrator access is required.",
          id,
          auth.status,
        );
      }
      const job = await base44.asServiceRole.entities.Job.get(
        clean(body.jobId, 120),
      ).catch(() => null);
      if (!job) return fail("not_found", "Job not found.", id, 404);
      const now = new Date().toISOString();
      const existing = await base44.asServiceRole.entities.PublicJobAccess
        .filter({ jobId: job.id }, "-created_date", 100).catch(() => []);
      await Promise.all(
        existing.filter((grant) => !grant.revoked_at && !grant.revokedAt).map((
          grant,
        ) =>
          base44.asServiceRole.entities.PublicJobAccess.update(grant.id, {
            revoked_at: now,
            revokedAt: now,
            revocation_reason: "rotated",
          })
        ),
      );
      const rawToken = makeToken();
      const tokenHash = await sha256(rawToken);
      const requested = Array.isArray(body.permissions)
        ? body.permissions
        : DEFAULT_PERMISSIONS;
      const permissions = [
        ...new Set(
          requested.filter((permission) => ALLOWED_PERMISSIONS.has(permission)),
        ),
      ];
      await base44.asServiceRole.entities.PublicJobAccess.create({
        jobId: job.id,
        job_id: job.id,
        tokenHash,
        token_hash: tokenHash,
        permissions,
        expires_after_completion_days: COMPLETION_ACCESS_DAYS,
        issued_by_user_id: auth.user.id,
        createdAt: now,
      });
      const configured = clean(Deno.env.get("PUBLIC_APP_ORIGIN"), 500);
      let origin = "https://ontherunelectrics.com.au";
      try {
        const candidate = new URL(configured || origin);
        if (
          candidate.protocol === "https:" && !candidate.username &&
          !candidate.password
        ) origin = candidate.origin;
      } catch {
        // The canonical production origin remains the safe fallback.
      }
      const policyExpiry = job.completed_at
        ? new Date(
          new Date(job.completed_at).getTime() +
            COMPLETION_ACCESS_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString()
        : null;
      return ok(
        {
          tracking_link: `${origin}/track/${encodeURIComponent(rawToken)}`,
          permissions,
          expires_at: policyExpiry,
          expires_after_completion_days: COMPLETION_ACCESS_DAYS,
        },
        id,
        201,
      );
    }

    if (action === "staff_revoke") {
      const auth = await requireAdmin(base44);
      if (auth.error) {
        return fail(
          auth.error,
          auth.error === "unauthorized"
            ? "Sign in to continue."
            : "Administrator access is required.",
          id,
          auth.status,
        );
      }
      const jobId = clean(body.jobId, 120);
      const grants = await base44.asServiceRole.entities.PublicJobAccess.filter(
        { jobId },
        "-created_date",
        100,
      ).catch(() => []);
      const now = new Date().toISOString();
      await Promise.all(
        grants.filter((grant) => !grant.revoked_at && !grant.revokedAt).map((
          grant,
        ) =>
          base44.asServiceRole.entities.PublicJobAccess.update(grant.id, {
            revoked_at: now,
            revokedAt: now,
            revocation_reason: "staff_revoked",
          })
        ),
      );
      return ok({ revoked: grants.length }, id);
    }

    const rawToken = clean(body.trackingToken || body.token || body.jobId, 256);
    const resolved = await validAccess(base44, rawToken);
    if (!resolved) return fail("invalid_grant", INVALID_LINK, id, 403);
    const { access, job } = resolved;

    if (action === "get") {
      if (
        !hasPermission(access, "view_status") &&
        !hasPermission(access, "view_booking") &&
        !hasPermission(access, "view_invoice") &&
        !hasPermission(access, "view_files")
      ) {
        return fail(
          "forbidden",
          "This link has no viewing permissions.",
          id,
          403,
        );
      }
      return ok(await payload(base44, job, access), id);
    }

    if (action === "list_files") {
      if (!hasPermission(access, "view_files")) {
        return fail("forbidden", "This link cannot view files.", id, 403);
      }
      const attachments = await listVisibleAttachments(base44, job);
      return ok({
        attachments: attachments.slice(0, 100).filter((item) =>
          !item.archived_at
        ).map(attachmentDto),
        limit: 100,
        potentially_truncated: attachments.length > 100,
      }, id);
    }

    if (action === "add_note") {
      if (!hasPermission(access, "add_note")) {
        return fail("forbidden", "This link cannot add notes.", id, 403);
      }
      const note = clean(body.note, 2000);
      if (!note) {
        return fail("validation_error", "A message is required.", id, 400);
      }
      await base44.asServiceRole.entities.JobNote.create({
        job_id: job.id,
        customer_id: job.customer_id || "",
        body: note,
        visibility: "customer",
        author_name: clean(job.customer_name, 160) || "Customer",
        author_role: "customer",
      });
      return ok(await payload(base44, job, access), id);
    }

    if (action === "upload_file") {
      if (!hasPermission(access, "upload_file")) {
        return fail("forbidden", "This link cannot upload files.", id, 403);
      }
      if (Deno.env.get("PRIVATE_UPLOADS_ENABLED") !== "true") {
        return fail(
          "uploads_unavailable",
          "Secure uploads are temporarily unavailable.",
          id,
          503,
        );
      }
      const mimeType = clean(body.mime_type, 120).toLowerCase();
      const kind = body.kind === "photo" ? "photo" : "document";
      const size = Number(body.file_size);
      const allowed = kind === "photo" ? IMAGE_TYPES : DOCUMENT_TYPES;
      const limit = kind === "photo" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
      if (!validPrivateUri(body.file_uri)) {
        return fail(
          "invalid_file",
          "A private uploaded file is required.",
          id,
          400,
        );
      }
      if (!allowed.has(mimeType)) {
        return fail(
          "invalid_type",
          "Choose a JPG, PNG, WebP, or PDF file.",
          id,
          400,
        );
      }
      if (!Number.isInteger(size) || size <= 0 || size > limit) {
        return fail(
          "invalid_size",
          `Choose a file smaller than ${limit / 1024 / 1024} MB.`,
          id,
          400,
        );
      }
      await base44.asServiceRole.entities.Attachment.create({
        job_id: job.id,
        customer_account_id: job.customer_account_id || "",
        customer_id: job.customer_id || "",
        file_uri: clean(body.file_uri, 2000),
        storage: "private",
        file_name: clean(body.file_name, 180) || "Customer upload",
        file_size: size,
        mime_type: mimeType,
        kind,
        visibility: "customer",
        uploaded_by_name: clean(job.customer_name, 160) || "Customer",
      });
      return ok(await payload(base44, job, access), id, 201);
    }

    if (action === "download_file") {
      if (!hasPermission(access, "view_files")) {
        return fail("forbidden", "This link cannot view files.", id, 403);
      }
      const attachment = await base44.asServiceRole.entities.Attachment.get(
        clean(body.attachment_id, 120),
      ).catch(() => null);
      if (
        !attachment || attachment.job_id !== job.id ||
        attachment.visibility !== "customer" || attachment.archived_at
      ) return fail("not_found", "File not found.", id, 404);
      if (attachment.storage !== "private" || !attachment.file_uri) {
        return fail(
          "migration_required",
          "This historical file is pending private-storage migration.",
          id,
          409,
        );
      }
      const signed = await base44.asServiceRole.integrations.Core
        .CreateFileSignedUrl({
          file_uri: attachment.file_uri,
          expires_in: SIGNED_URL_SECONDS,
        });
      const signedUrl = safeSignedUrl(signed.signed_url);
      if (!signedUrl) {
        return fail(
          "signing_failed",
          "A secure download link could not be created.",
          id,
          502,
        );
      }
      return ok({
        signed_url: signedUrl,
        expires_in: SIGNED_URL_SECONDS,
        file_name: attachment.file_name,
      }, id);
    }

    if (action === "start_payment" || action === "verify_payment") {
      return fail(
        "payments_retired",
        "Online payments are not available. Please contact the workshop to arrange payment.",
        id,
        410,
      );
    }

    return fail(
      "unknown_action",
      "That tracking action is not supported.",
      id,
      400,
    );
  } catch (error) {
    console.error(
      "[publicJobAccessActions]",
      JSON.stringify({
        request_id: id,
        code: "tracking_action_failed",
        message: clean(error?.message || error, 500),
      }),
    );
    return fail(
      "internal_error",
      "This tracking request could not be completed.",
      id,
      500,
    );
  }
});
