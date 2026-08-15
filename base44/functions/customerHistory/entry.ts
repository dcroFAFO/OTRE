import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

type EntityRecord = Record<string, unknown>;
type Entities = ReturnType<
  typeof createClientFromRequest
>["asServiceRole"]["entities"];
type BoundedResult = {
  items: EntityRecord[];
  truncated: boolean;
  failed: boolean;
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10_000;
const DEFAULT_RELATED_LIMIT = 500;
const MAX_RELATED_LIMIT = 2_000;
const SCOOTER_LIMIT = 200;
const NOTE_LIMIT = 200;
const AUDIT_LIMIT = 500;
const FEEDBACK_LIMIT = 100;
const DEFAULT_TIMELINE_LIMIT = 250;
const MAX_TIMELINE_LIMIT = 500;

const JOB_FIELDS = [
  "id",
  "reference",
  "status",
  "asset_id",
  "asset_label",
  "scooter_make_model",
  "issue_summary",
  "issueDescription",
  "issue_description",
  "service_type",
  "job_type",
  "created_date",
  "createdAt",
  "created_at",
  "scheduled_date",
  "completed_at",
  "customer_account_id",
];

const INVOICE_FIELDS = [
  "id",
  "number",
  "invoice_id",
  "job_id",
  "customer_account_id",
  "status",
  "invoiceSentAt",
  "issued_at",
  "created_date",
  "due_date",
  "paid_at",
  "paid_date",
  "amount",
  "line_items",
  "currency",
];

const QUOTE_FIELDS = [
  "id",
  "job_id",
  "total",
  "line_items",
  "created_date",
];

const NOTE_FIELDS = [
  "id",
  "customer_id",
  "body",
  "author_name",
  "created_date",
];
const AUDIT_FIELDS = [
  "id",
  "customer_account_id",
  "summary",
  "actor_name",
  "created_date",
];
const FEEDBACK_FIELDS = [
  "id",
  "customer_id",
  "job_id",
  "subject",
  "feedback_type",
  "status",
  "created_date",
];

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanEmail(value: unknown) {
  return text(value).trim().toLowerCase();
}

function boundedInteger(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function staffCustomerDto(customer: EntityRecord) {
  const id = text(customer.id);
  return {
    id,
    reference: text(customer.customer_id) || id,
    name: text(customer.full_name) || text(customer.name),
    email: cleanEmail(customer.email),
    phone_e164: text(customer.phone_e164),
    status: text(customer.status) || "active",
    referral_code: text(customer.referral_code),
    referral_status: text(customer.referral_status) || "none",
    referral_eligible: Boolean(customer.referral_eligible),
    user_id: text(customer.user_id),
    phone: text(customer.phone),
    phone_display: text(customer.phone_display),
    tags: stringArray(customer.tags),
    last_activity_date: text(customer.last_activity_date) || null,
    notes: text(customer.notes),
    referral_notes: text(customer.referral_notes),
  };
}

function lineItemsTotal(items: unknown) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, rawItem) => {
    const item = rawItem && typeof rawItem === "object"
      ? rawItem as EntityRecord
      : {};
    if (item.amount !== undefined && item.amount !== null) {
      return sum + numberValue(item.amount);
    }
    if (item.line_total !== undefined && item.line_total !== null) {
      return sum + numberValue(item.line_total);
    }
    if (
      item.customer_line_total !== undefined &&
      item.customer_line_total !== null
    ) {
      return sum + numberValue(item.customer_line_total);
    }
    const unitPrice = item.customer_unit_price ?? item.unit_price;
    return sum +
      (numberValue(item.qty || 1) * numberValue(unitPrice)) -
      numberValue(item.discount_amount);
  }, 0);
}

function recordTotal(record: EntityRecord) {
  if (record.amount !== undefined && record.amount !== null) {
    return numberValue(record.amount);
  }
  if (record.total !== undefined && record.total !== null) {
    return numberValue(record.total);
  }
  return lineItemsTotal(record.line_items);
}

function moneyTotal(records: EntityRecord[]) {
  return records.reduce((sum, record) => sum + recordTotal(record), 0);
}

async function readBounded(
  label: string,
  fetchRows: () => Promise<unknown>,
  limit: number,
): Promise<BoundedResult> {
  try {
    const value = await fetchRows();
    if (!Array.isArray(value)) throw new Error("Unexpected entity response");
    return {
      items: (value as EntityRecord[]).slice(0, limit),
      truncated: value.length > limit,
      failed: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[customerHistory] ${label} query failed`, message);
    return { items: [], truncated: false, failed: true };
  }
}

function indexByJob(records: EntityRecord[]) {
  const indexed = new Map<string, EntityRecord[]>();
  for (const record of records) {
    const jobId = text(record.job_id);
    if (!jobId) continue;
    const current = indexed.get(jobId);
    if (current) current.push(record);
    else indexed.set(jobId, [record]);
  }
  return indexed;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({})) as EntityRecord;
    const customerId = text(payload.customer_id);
    if (!customerId) {
      return Response.json({ error: "customer_id is required" }, {
        status: 400,
      });
    }

    const page = boundedInteger(payload.page, 1, MAX_PAGE);
    const limit = boundedInteger(
      payload.limit,
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const relatedLimit = boundedInteger(
      payload.related_limit,
      DEFAULT_RELATED_LIMIT,
      MAX_RELATED_LIMIT,
    );
    const timelineLimit = boundedInteger(
      payload.timeline_limit,
      DEFAULT_TIMELINE_LIMIT,
      MAX_TIMELINE_LIMIT,
    );
    const skip = (page - 1) * limit;
    const entities: Entities = base44.asServiceRole.entities;
    const customer = await entities.Customer.get(customerId).catch(() =>
      null
    ) as EntityRecord | null;
    if (!customer) {
      return Response.json({ error: "Customer not found" }, { status: 404 });
    }
    const canonicalCustomerId = text(customer.id);
    if (!canonicalCustomerId) {
      return Response.json({ error: "Customer record is invalid" }, {
        status: 500,
      });
    }

    const jobsResult = await readBounded(
      "jobs",
      () =>
        entities.Job.filter(
          { customer_account_id: canonicalCustomerId },
          "-created_date",
          limit + 1,
          skip,
          JOB_FIELDS,
        ),
      limit,
    );
    const jobs = jobsResult.items;
    const jobIds = jobs.map((job) => text(job.id)).filter(Boolean);

    const emptyResult = (): BoundedResult => ({
      items: [],
      truncated: false,
      failed: false,
    });
    const [
      invoiceResult,
      quoteResult,
      scooterResult,
      noteResult,
      auditResult,
      feedbackResult,
    ] = await Promise.all([
      jobIds.length
        ? readBounded(
          "invoices",
          () =>
            entities.Invoice.filter(
              {
                customer_account_id: canonicalCustomerId,
                job_id: { $in: jobIds },
              },
              "-created_date",
              relatedLimit + 1,
              0,
              INVOICE_FIELDS,
            ),
          relatedLimit,
        )
        : Promise.resolve(emptyResult()),
      jobIds.length
        ? readBounded(
          "quotes",
          () =>
            entities.Quote.filter(
              { job_id: { $in: jobIds } },
              "-created_date",
              relatedLimit + 1,
              0,
              QUOTE_FIELDS,
            ),
          relatedLimit,
        )
        : Promise.resolve(emptyResult()),
      readBounded(
        "scooters",
        () =>
          entities.Scooter.filter(
            { customer_account_id: canonicalCustomerId },
            "make",
            SCOOTER_LIMIT + 1,
          ),
        SCOOTER_LIMIT,
      ),
      readBounded(
        "notes",
        () =>
          entities.CustomerNote.filter(
            { customer_id: canonicalCustomerId },
            "-created_date",
            NOTE_LIMIT + 1,
            0,
            NOTE_FIELDS,
          ),
        NOTE_LIMIT,
      ),
      readBounded(
        "audits",
        () =>
          entities.AuditEvent.filter(
            { customer_account_id: canonicalCustomerId },
            "-created_date",
            AUDIT_LIMIT + 1,
            0,
            AUDIT_FIELDS,
          ),
        AUDIT_LIMIT,
      ),
      readBounded(
        "feedback",
        () =>
          entities.Feedback.filter(
            { customer_id: canonicalCustomerId },
            "-created_date",
            FEEDBACK_LIMIT + 1,
            0,
            FEEDBACK_FIELDS,
          ),
        FEEDBACK_LIMIT,
      ),
    ]);

    const jobIdSet = new Set(jobIds);
    const invoices = invoiceResult.items.filter((invoice) =>
      jobIdSet.has(text(invoice.job_id))
    );
    const quotes = quoteResult.items.filter((quote) =>
      jobIdSet.has(text(quote.job_id))
    );
    const scooters = scooterResult.items;
    const notes = noteResult.items;
    const audits = auditResult.items;
    const feedback = feedbackResult.items.filter((item) => {
      const jobId = text(item.job_id);
      return !jobId || jobIdSet.has(jobId);
    });

    const invoicesByJob = indexByJob(invoices);
    const quotesByJob = indexByJob(quotes);
    const jobById = new Map(jobs.map((job) => [text(job.id), job]));
    const scooterById = new Map(
      scooters.map((scooter) => [text(scooter.id), scooter]),
    );

    const relatedJobs = jobs.map((job) => {
      const jobId = text(job.id);
      const jobInvoices = invoicesByJob.get(jobId) || [];
      const jobQuotes = quotesByJob.get(jobId) || [];
      const asset = scooterById.get(text(job.asset_id));
      const assetLabel = asset
        ? [text(asset.make), text(asset.model)].filter(Boolean).join(" ")
        : text(job.asset_label) || text(job.scooter_make_model);
      return {
        id: jobId,
        reference: text(job.reference) || jobId,
        status: text(job.status) || "requested",
        asset_id: text(job.asset_id),
        asset_label: assetLabel,
        issue_summary: text(job.issue_summary) || text(job.issueDescription) ||
          text(job.issue_description),
        service_type: text(job.service_type) || text(job.job_type),
        created_date: text(job.created_date) || text(job.createdAt) ||
          text(job.created_at),
        scheduled_date: text(job.scheduled_date),
        completed_date: text(job.completed_at),
        quoted_total: moneyTotal(jobQuotes),
        invoiced_total: moneyTotal(jobInvoices),
      };
    });

    const relatedInvoices = invoices.map((invoice) => {
      const total = recordTotal(invoice);
      const paid = ["paid", "settled", "completed"].includes(
        text(invoice.status).toLowerCase(),
      );
      const jobId = text(invoice.job_id);
      return {
        id: text(invoice.id),
        number: text(invoice.number) || text(invoice.invoice_id) ||
          text(invoice.id),
        job_id: jobId,
        job_reference: text(jobById.get(jobId)?.reference) || jobId,
        status: text(invoice.status) || "outstanding",
        issue_date: text(invoice.invoiceSentAt) || text(invoice.issued_at) ||
          text(invoice.created_date),
        due_date: text(invoice.due_date),
        paid_date: text(invoice.paid_at) || text(invoice.paid_date),
        amount: total,
        currency: text(invoice.currency) || "AUD",
        outstanding_balance: paid ? 0 : total,
      };
    });

    const timelineEvents: EntityRecord[] = [];
    const push = (event: EntityRecord) => {
      if (text(event.date)) timelineEvents.push(event);
    };
    push({
      kind: "signup",
      icon: "UserPlus",
      title: "Account created",
      date: customer.created_date,
    });
    for (const job of relatedJobs) {
      push({
        kind: "job",
        icon: "Wrench",
        title: `${job.reference} — ${job.service_type || "Service"}`,
        subtitle: `Status: ${String(job.status).replace(/_/g, " ")}`,
        date: job.created_date,
        link: `/dashboard/jobs?id=${job.id}`,
      });
    }
    for (const invoice of relatedInvoices) {
      push({
        kind: "invoice",
        icon: "Receipt",
        title: `Invoice ${invoice.number} — ${invoice.currency} ${
          invoice.amount.toFixed(2)
        }`,
        subtitle: `Status: ${invoice.status}`,
        date: invoice.paid_date || invoice.issue_date,
        link: `/dashboard/invoices?id=${invoice.id}`,
      });
    }
    for (const item of feedback) {
      push({
        kind: "feedback",
        icon: "MessageSquare",
        title: `Feedback: ${text(item.subject)}`,
        subtitle: `${text(item.feedback_type)} · ${text(item.status)}`,
        date: item.created_date,
      });
    }
    for (const note of notes) {
      push({
        kind: "note",
        icon: "StickyNote",
        title: "Internal note",
        subtitle: text(note.body),
        author: text(note.author_name),
        date: note.created_date,
      });
    }
    for (const audit of audits) {
      push({
        kind: "audit",
        icon: "RefreshCw",
        title: text(audit.summary) || "Account updated",
        author: text(audit.actor_name),
        date: audit.created_date,
      });
    }
    timelineEvents.sort((left, right) => (
      new Date(text(right.date)).getTime() - new Date(text(left.date)).getTime()
    ));
    const timelineTruncated = timelineEvents.length > timelineLimit;
    const timeline = timelineEvents.slice(0, timelineLimit);

    const truncation = {
      jobs: page > 1 || jobsResult.truncated,
      invoices: invoiceResult.truncated,
      quotes: quoteResult.truncated,
      scooters: scooterResult.truncated,
      feedback: feedbackResult.truncated,
      notes: noteResult.truncated,
      audits: auditResult.truncated,
      timeline: timelineTruncated,
    };
    const queryFailures = [
      ...(jobsResult.failed ? ["jobs"] : []),
      ...(invoiceResult.failed ? ["invoices"] : []),
      ...(quoteResult.failed ? ["quotes"] : []),
      ...(scooterResult.failed ? ["scooters"] : []),
      ...(noteResult.failed ? ["notes"] : []),
      ...(auditResult.failed ? ["audits"] : []),
      ...(feedbackResult.failed ? ["feedback"] : []),
    ];
    const potentiallyTruncated = Object.values(truncation).some(Boolean) ||
      queryFailures.length > 0;
    const partial = potentiallyTruncated;

    return Response.json({
      customer: staffCustomerDto(customer),
      counts: {
        jobs: relatedJobs.length,
        invoices: relatedInvoices.length,
        scooters: scooters.length,
        feedback: feedback.length,
        notes: notes.length,
      },
      linked: {
        jobs: relatedJobs,
        invoices: relatedInvoices,
        scooters,
        feedback: feedback.map((item) => ({
          id: text(item.id),
          subject: text(item.subject),
          type: text(item.feedback_type),
          status: text(item.status),
          date: text(item.created_date),
        })),
      },
      timeline,
      page,
      limit,
      partial,
      potentially_truncated: potentiallyTruncated,
      pagination: {
        page,
        limit,
        has_more: jobsResult.truncated,
        next_page: jobsResult.truncated ? page + 1 : null,
      },
      truncation,
      query_failures: queryFailures,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[customerHistory] failed", message);
    return Response.json({ error: "Failed to load customer history." }, {
      status: 500,
    });
  }
});
