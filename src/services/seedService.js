import { base44 } from "@/api/base44Client";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_BOOKING_COPY,
  DEFAULT_BOOKING_FIELDS,
  DEFAULT_BUSINESS,
  DEFAULT_INVOICE_SETTINGS,
  DEFAULT_JOB_STATUSES,
  DEFAULT_JOB_TYPES,
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_PAYMENT_PROVIDER_CONFIG,
  DEFAULT_QUOTE_TEMPLATE,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_ROLES,
  DEFAULT_SERVICE_CATEGORIES,
  DEFAULT_SERVICES,
} from "@/config/platformConfig";
import { logAudit } from "./auditService";

function isoDaysFromNow(d) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

const TECHS = [
  { full_name: "Mason Reid", short_name: "Mason R.", role: "technician", role_label: "Technician", color: "teal", active: true },
  { full_name: "Ella Turner", short_name: "Ella T.", role: "technician", role_label: "Technician", color: "indigo", active: true },
  { full_name: "Priya Nair", short_name: "Priya N.", role: "employee", role_label: "Employee", color: "violet", active: true },
];

const DEMO_JOBS = [
  { reference: "OTR-1042", customer_name: "Liam Carter", customer_email: "liam@example.com", customer_phone: "0411 222 333", asset_label: "Segway Ninebot Max G30", issue_description: "Rear tyre puncture and brake adjustment", status: "waiting_customer", waiting_reason: "customer", assigned_technician_name: "Mason R.", payment_status: "outstanding", quote_status: "sent", job_type: "repair", offset: 0 },
  { reference: "OTR-1043", customer_name: "Ava Singh", customer_email: "ava@example.com", customer_phone: "0422 333 444", asset_label: "Apollo City Pro", issue_description: "Battery not charging", status: "waiting_supplier", waiting_reason: "supplier", assigned_technician_name: "Ella T.", payment_status: "unpaid", quote_status: "sent", job_type: "diagnostic", offset: 1 },
  { reference: "OTR-1044", customer_name: "Noah Williams", customer_email: "noah@example.com", customer_phone: "0433 444 555", asset_label: "Xiaomi Mi Pro 2", issue_description: "Throttle fault and controller check", status: "repair_in_progress", assigned_technician_name: "Mason R.", payment_status: "unpaid", quote_status: "approved", job_type: "repair", offset: 0 },
  { reference: "OTR-1045", customer_name: "Sophie Nguyen", customer_email: "sophie@example.com", customer_phone: "0444 555 666", asset_label: "Dragon GTR V2", issue_description: "General service and brake pad replacement", status: "ready_for_pickup", assigned_technician_name: "Ella T.", payment_status: "paid", quote_status: "approved", job_type: "service", ready_for_pickup: true, offset: -1 },
  { reference: "OTR-1046", customer_name: "Daniel Kim", customer_email: "daniel@example.com", customer_phone: "0455 666 777", asset_label: "Pure Air Pro", issue_description: "Won't power on — diagnostic needed", status: "requested", payment_status: "unpaid", quote_status: "draft", job_type: "diagnostic", offset: 2 },
  { reference: "OTR-1047", customer_name: "Maya Foster", customer_email: "maya@example.com", customer_phone: "0466 777 888", asset_label: "Inokim Light 2", issue_description: "Annual service + tyre check", status: "technician_assigned", assigned_technician_name: "Priya N.", payment_status: "unpaid", quote_status: "draft", job_type: "service", offset: 3 },
];

async function createIfNone(entity, query, data) {
  const existing = await base44.entities[entity].filter(query, "", 1);
  if (existing.length === 0) return base44.entities[entity].create(data);
  return existing[0];
}

async function seedConfiguration() {
  await createIfNone("BusinessProfile", { slug: DEFAULT_BUSINESS.slug }, {
    slug: DEFAULT_BUSINESS.slug,
    name: DEFAULT_BUSINESS.name,
    legal_name: DEFAULT_BUSINESS.legalName,
    tagline: DEFAULT_BUSINESS.tagline,
    subheading: DEFAULT_BUSINESS.subheading,
    email: DEFAULT_BUSINESS.email,
    phone: DEFAULT_BUSINESS.phone,
    address: DEFAULT_BUSINESS.address,
    locations: DEFAULT_BUSINESS.locations,
    opening_hours: DEFAULT_BUSINESS.openingHours,
    currency: DEFAULT_BUSINESS.currency,
    timezone: DEFAULT_BUSINESS.timezone,
    is_default: true,
  });

  await createIfNone("AppSetting", { key: "app" }, { key: "app", value: DEFAULT_APP_SETTINGS, description: "Configurable platform terminology and UI labels", active: true });
  await createIfNone("BusinessSetting", { business_slug: DEFAULT_BUSINESS.slug, key: "booking_copy" }, { business_slug: DEFAULT_BUSINESS.slug, key: "booking_copy", value: DEFAULT_BOOKING_COPY, active: true });
  await createIfNone("InvoiceSetting", { business_slug: DEFAULT_BUSINESS.slug }, { business_slug: DEFAULT_BUSINESS.slug, ...DEFAULT_INVOICE_SETTINGS, active: true });
  await createIfNone("PaymentProviderConfig", { business_slug: DEFAULT_BUSINESS.slug, provider_key: DEFAULT_PAYMENT_PROVIDER_CONFIG.provider_key }, { business_slug: DEFAULT_BUSINESS.slug, ...DEFAULT_PAYMENT_PROVIDER_CONFIG });
  await createIfNone("QuoteTemplate", { business_slug: DEFAULT_BUSINESS.slug, name: DEFAULT_QUOTE_TEMPLATE.name }, { business_slug: DEFAULT_BUSINESS.slug, ...DEFAULT_QUOTE_TEMPLATE, active: true });

  for (const [i, item] of DEFAULT_SERVICE_CATEGORIES.entries()) {
    await createIfNone("ServiceCategory", { business_slug: DEFAULT_BUSINESS.slug, key: item.key }, { business_slug: DEFAULT_BUSINESS.slug, ...item, order: item.order ?? i, active: true });
  }
  for (const [i, item] of DEFAULT_SERVICES.entries()) {
    await createIfNone("ServiceItem", { business_slug: DEFAULT_BUSINESS.slug, name: item.name }, { business_slug: DEFAULT_BUSINESS.slug, ...item, order: i, active: true });
  }
  for (const [i, item] of DEFAULT_JOB_STATUSES.entries()) {
    await createIfNone("JobStatus", { business_slug: DEFAULT_BUSINESS.slug, key: item.key }, { business_slug: DEFAULT_BUSINESS.slug, ...item, order: i, active: true });
  }
  for (const [i, item] of DEFAULT_JOB_TYPES.entries()) {
    await createIfNone("JobType", { business_slug: DEFAULT_BUSINESS.slug, key: item.key }, { business_slug: DEFAULT_BUSINESS.slug, ...item, order: i, active: true });
  }
  for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
    await createIfNone("Role", { business_slug: DEFAULT_BUSINESS.slug, key }, { business_slug: DEFAULT_BUSINESS.slug, ...role, order: Object.keys(DEFAULT_ROLES).indexOf(key), active: true });
    for (const action of DEFAULT_ROLE_PERMISSIONS[key] || []) {
      await createIfNone("Permission", { business_slug: DEFAULT_BUSINESS.slug, role_key: key, action }, { business_slug: DEFAULT_BUSINESS.slug, role_key: key, action, active: true });
    }
  }
  for (const field of DEFAULT_BOOKING_FIELDS) {
    await createIfNone("BookingFieldConfig", { business_slug: DEFAULT_BUSINESS.slug, key: field.key }, { business_slug: DEFAULT_BUSINESS.slug, ...field, active: true });
  }
  for (const template of DEFAULT_NOTIFICATION_TEMPLATES) {
    await createIfNone("NotificationTemplate", { business_slug: DEFAULT_BUSINESS.slug, key: template.key, channel: template.channel }, { business_slug: DEFAULT_BUSINESS.slug, ...template, active: true });
  }
}

export async function seedIfEmpty() {
  await seedConfiguration();

  const existing = await base44.entities.Job.list("-created_date", 1);
  if (existing.length > 0) return false;

  const staff = await base44.entities.StaffProfile.list("", 1);
  if (staff.length === 0) {
    await base44.entities.StaffProfile.bulkCreate(TECHS.map((s) => ({ ...s, business_slug: DEFAULT_BUSINESS.slug })));
  }

  for (const j of DEMO_JOBS) {
    const { offset, asset_label, ...rest } = j;
    const job = await base44.entities.Job.create({ ...rest, asset_label, scooter_label: asset_label, scheduled_date: isoDaysFromNow(offset), business_slug: DEFAULT_BUSINESS.slug });
    await logAudit({ eventType: "booking_created", jobId: job.id, summary: `Booking created for ${job.customer_name}`, visibility: "system" });
    if (j.quote_status !== "draft") {
      await base44.entities.Quote.create({ job_id: job.id, labour_estimate: 80, parts_estimate: 45, total: 125, currency: DEFAULT_BUSINESS.currency, status: j.quote_status === "approved" ? "approved" : "sent", recommended_repair: j.issue_description, sent_date: new Date().toISOString() });
    }
    if (j.payment_status === "outstanding" || j.payment_status === "paid") {
      await base44.entities.Invoice.create({ job_id: job.id, number: `${DEFAULT_INVOICE_SETTINGS.prefix}-${j.reference}`, amount: 125, currency: DEFAULT_BUSINESS.currency, status: j.payment_status });
    }
  }
  return true;
}