import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

type EntityRecord = Record<string, unknown>;
type Entities = ReturnType<
  typeof createClientFromRequest
>["asServiceRole"]["entities"];

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10_000;
const RELATED_QUERY_LIMIT = 5_000;
const DUPLICATE_QUERY_LIMIT = 10;
const SEARCH_LIMIT = 8;
const NOTE_LIMIT = 200;

const CUSTOMER_FIELDS = [
  "id",
  "customer_id",
  "full_name",
  "name",
  "email",
  "phone",
  "phone_e164",
  "phone_display",
  "status",
  "referral_code",
  "referred_by_customer_id",
  "referral_status",
  "referral_eligible",
  "user_id",
  "tags",
  "last_activity_date",
  "notes",
  "referral_notes",
  "created_date",
  "updated_date",
];

const JOB_SUMMARY_FIELDS = [
  "id",
  "customer_account_id",
  "created_date",
  "updated_date",
];

const SCOOTER_SUMMARY_FIELDS = [
  "id",
  "customer_account_id",
  "make",
  "model",
  "updated_date",
];

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function cleanEmail(value: unknown) {
  return text(value).trim().toLowerCase();
}

function normalizePhone(value: unknown) {
  let cleaned = text(value).trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+61")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("61")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, "")}`;
  return /^\+614\d{8}$/.test(phone) ? phone : "";
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
    referred_by_customer_id: text(customer.referred_by_customer_id),
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

function staffNoteDto(note: EntityRecord) {
  return {
    id: text(note.id),
    customer_id: text(note.customer_id),
    body: text(note.body),
    author_id: text(note.author_id),
    author_name: text(note.author_name) || "Administrator",
    created_date: text(note.created_date) || null,
    updated_date: text(note.updated_date) || null,
  };
}

function groupByCustomer(records: EntityRecord[]) {
  const grouped = new Map<string, EntityRecord[]>();
  for (const record of records) {
    const customerId = text(record.customer_account_id);
    if (!customerId) continue;
    const current = grouped.get(customerId);
    if (current) current.push(record);
    else grouped.set(customerId, [record]);
  }
  return grouped;
}

async function listCustomers(entities: Entities, payload: EntityRecord) {
  const page = boundedInteger(payload.page, 1, MAX_PAGE);
  const limit = boundedInteger(payload.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;
  const customerRows = await entities.Customer.list(
    "-updated_date",
    limit + 1,
    skip,
    CUSTOMER_FIELDS,
  ) as EntityRecord[];
  const hasMore = customerRows.length > limit;
  const customers = customerRows.slice(0, limit);
  const customerIds = customers.map((customer) => text(customer.id)).filter(
    Boolean,
  );

  let jobs: EntityRecord[] = [];
  let scooters: EntityRecord[] = [];
  let jobsFailed = false;
  let scootersFailed = false;

  if (customerIds.length) {
    const [jobResult, scooterResult] = await Promise.allSettled([
      entities.Job.filter(
        { customer_account_id: { $in: customerIds } },
        "-updated_date",
        RELATED_QUERY_LIMIT,
        0,
        JOB_SUMMARY_FIELDS,
      ),
      entities.Scooter.filter(
        { customer_account_id: { $in: customerIds } },
        "-updated_date",
        RELATED_QUERY_LIMIT,
        0,
        SCOOTER_SUMMARY_FIELDS,
      ),
    ]);
    if (jobResult.status === "fulfilled") {
      jobs = jobResult.value as EntityRecord[];
    } else jobsFailed = true;
    if (scooterResult.status === "fulfilled") {
      scooters = scooterResult.value as EntityRecord[];
    } else scootersFailed = true;
  }

  const jobsByCustomer = groupByCustomer(jobs);
  const scootersByCustomer = groupByCustomer(scooters);
  const customerDtos = customers.map((customer) => {
    const customerId = text(customer.id);
    const customerJobs = jobsByCustomer.get(customerId) || [];
    const customerScooters = scootersByCustomer.get(customerId) || [];
    let latestJobDate = "";
    for (const job of customerJobs) {
      const date = text(job.updated_date) || text(job.created_date);
      if (date > latestJobDate) latestJobDate = date;
    }
    return {
      ...staffCustomerDto(customer),
      scooter_count: customerScooters.length,
      scooters: customerScooters.slice(0, 3).map((scooter) => (
        [text(scooter.make), text(scooter.model)].filter(Boolean).join(" ") ||
        text(scooter.model) || "Scooter"
      )),
      job_count: customerJobs.length,
      last_job_date: latestJobDate,
      last_activity_date: text(customer.last_activity_date) || latestJobDate ||
        text(customer.updated_date),
    };
  }).sort((left, right) => (
    String(right.last_activity_date || "").localeCompare(
      String(left.last_activity_date || ""),
    )
  ));

  const jobsPotentiallyTruncated = jobs.length === RELATED_QUERY_LIMIT;
  const scootersPotentiallyTruncated = scooters.length === RELATED_QUERY_LIMIT;
  const potentiallyTruncated = page > 1 || hasMore ||
    jobsPotentiallyTruncated || scootersPotentiallyTruncated || jobsFailed ||
    scootersFailed;
  const partial = potentiallyTruncated;

  return {
    customers: customerDtos,
    page,
    limit,
    partial,
    potentially_truncated: potentiallyTruncated,
    pagination: {
      page,
      limit,
      has_more: hasMore,
      next_page: hasMore ? page + 1 : null,
    },
    truncation: {
      customers: page > 1 || hasMore,
      jobs: jobsPotentiallyTruncated,
      scooters: scootersPotentiallyTruncated,
    },
    query_failures: [
      ...(jobsFailed ? ["jobs"] : []),
      ...(scootersFailed ? ["scooters"] : []),
    ],
  };
}

async function checkDuplicateContact(
  entities: Entities,
  email: unknown,
  phone: unknown,
  excludeCustomerId: unknown,
) {
  const normalizedEmail = cleanEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const excludedId = text(excludeCustomerId);
  const [emailRows, phoneRows] = await Promise.all([
    normalizedEmail
      ? entities.Customer.filter(
        { email: normalizedEmail },
        "-updated_date",
        DUPLICATE_QUERY_LIMIT + 1,
        0,
        CUSTOMER_FIELDS,
      )
      : Promise.resolve([]),
    normalizedPhone
      ? entities.Customer.filter(
        { phone_e164: normalizedPhone },
        "-updated_date",
        DUPLICATE_QUERY_LIMIT + 1,
        0,
        CUSTOMER_FIELDS,
      )
      : Promise.resolve([]),
  ]);
  const byEmail = emailRows as EntityRecord[];
  const byPhone = phoneRows as EntityRecord[];
  const emailConflict = byEmail.slice(0, DUPLICATE_QUERY_LIMIT)
    .find((customer) => text(customer.id) !== excludedId) || null;
  const phoneConflict = byPhone.slice(0, DUPLICATE_QUERY_LIMIT)
    .find((customer) => text(customer.id) !== excludedId) || null;
  const potentiallyTruncated = byEmail.length > DUPLICATE_QUERY_LIMIT ||
    byPhone.length > DUPLICATE_QUERY_LIMIT;

  return {
    emailConflict: emailConflict ? staffCustomerDto(emailConflict) : null,
    phoneConflict: phoneConflict ? staffCustomerDto(phoneConflict) : null,
    partial: potentiallyTruncated,
    potentially_truncated: potentiallyTruncated,
  };
}

async function searchCustomers(entities: Entities, payload: EntityRecord) {
  const field = text(payload.field);
  const rawQuery = text(payload.query).trim();
  if (!rawQuery || !["name", "email", "phone"].includes(field)) {
    return { customers: [], partial: false, potentially_truncated: false };
  }

  const filters: Array<Record<string, string>> = [];
  if (field === "name") filters.push({ full_name: rawQuery });
  if (field === "email") filters.push({ email: cleanEmail(rawQuery) });
  if (field === "phone") {
    const normalized = normalizePhone(rawQuery);
    if (normalized) filters.push({ phone_e164: normalized });
    filters.push({ phone: rawQuery });
  }

  const results = await Promise.all(filters.map((filter) =>
    entities.Customer.filter(
      filter,
      "-updated_date",
      SEARCH_LIMIT + 1,
      0,
      CUSTOMER_FIELDS,
    )
  ));
  const rows = [...new Map(
    (results.flat() as EntityRecord[]).map((customer) => [text(customer.id), customer]),
  ).values()].filter((customer) => text(customer.id));
  return {
    customers: rows.slice(0, SEARCH_LIMIT).map(staffCustomerDto),
    partial: rows.length > SEARCH_LIMIT,
    potentially_truncated: rows.length > SEARCH_LIMIT,
    limit: SEARCH_LIMIT,
  };
}

async function listCustomerNotes(entities: Entities, payload: EntityRecord) {
  const customerId = text(payload.customer_id);
  if (!customerId) throw new Error("customer_id is required");
  const customer = await entities.Customer.get(customerId).catch(() => null);
  if (!customer) return null;
  const rows = await entities.CustomerNote.filter(
    { customer_id: customerId },
    "-created_date",
    NOTE_LIMIT + 1,
  ) as EntityRecord[];
  return {
    notes: rows.slice(0, NOTE_LIMIT).map(staffNoteDto),
    partial: rows.length > NOTE_LIMIT,
    potentially_truncated: rows.length > NOTE_LIMIT,
    limit: NOTE_LIMIT,
  };
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
    const entities = base44.asServiceRole.entities;
    if (payload.action === "list") {
      return Response.json(await listCustomers(entities, payload));
    }
    if (payload.action === "search") {
      return Response.json(await searchCustomers(entities, payload));
    }
    if (payload.action === "get") {
      const customerId = text(payload.customer_id);
      if (!customerId) {
        return Response.json({ error: "customer_id is required" }, {
          status: 400,
        });
      }
      let customer = await entities.Customer.get(customerId).catch(() =>
        null
      ) as EntityRecord | null;
      if (!customer) {
        const matches = await entities.Customer.filter(
          { customer_id: customerId },
          "-updated_date",
          2,
          0,
          CUSTOMER_FIELDS,
        ) as EntityRecord[];
        customer = matches.length === 1 ? matches[0] : null;
      }
      return customer
        ? Response.json({
          customer: staffCustomerDto(customer),
          partial: false,
          potentially_truncated: false,
        })
        : Response.json({ error: "Customer not found" }, { status: 404 });
    }
    if (payload.action === "checkDuplicateContact") {
      return Response.json(
        await checkDuplicateContact(
          entities,
          payload.email,
          payload.phone,
          payload.exclude_customer_id,
        ),
      );
    }
    if (payload.action === "listNotes") {
      const result = await listCustomerNotes(entities, payload);
      return result
        ? Response.json(result)
        : Response.json({ error: "Customer not found" }, { status: 404 });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[customerRead] failed", message);
    return Response.json({ error: "Customer read failed" }, { status: 500 });
  }
});
