import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CURRENCY = "AUD";

const APP_SETTINGS = {
  terminology: {
    platformLabel: "Job Platform", jobSingular: "job", jobPlural: "jobs", customerSingular: "customer",
    staffAssignmentLabel: "Technician", staffAssignmentLabelPlural: "Technicians", assetSingular: "scooter",
    assetPlural: "scooters", serviceRequestLabel: "booking request", readyStateLabel: "Ready for pickup", operationalAreaLabel: "workshop",
  },
  landing: {
    navLinks: [{ label: "Services", href: "#services" }, { label: "How it works", href: "#journey" }, { label: "Book a repair", href: "#book" }],
    heroEyebrow: "Repairs · Servicing · Sales",
    heroBenefits: ["All major brands serviced", "Genuine & compatible parts", "Transparent fixed-price quotes"],
    servicesEyebrow: "What we do", servicesTitle: "Everything your scooter needs, in one place",
    servicesBody: "From quick puncture fixes to full electrical diagnostics and brand-new scooters — handled by people who know e-scooters inside out.",
    journeyEyebrow: "How it works", journeyTitle: "From drop-off to pickup — always in the loop",
    journeyBody: "Every job moves through clear, tracked stages. You'll know exactly where your scooter is at all times.",
    portalLabel: "Customer Portal",
  },
  dashboard: {
    nav: { overview: "Overview", jobs: "Jobs", calendar: "Calendar" },
    overviewSubtitle: "Everything happening across your workshop right now.",
    metrics: { active: "Active jobs", awaitingCustomer: "Awaiting customer", waitingParts: "Waiting for parts", readyPickup: "Ready for pickup", outstanding: "Invoice outstanding", completedWeek: "Completed this week", requested: "Bookings requested", total: "Total jobs" },
  },
};

const BUSINESS = {
  name: "On The Run Electrics", legal_name: "On The Run Electrics",
  tagline: "Expert electric scooter repairs, servicing, and sales.",
  subheading: "From puncture fixes and battery replacements to full diagnostics and brand-new scooters — handled by specialists who know e-scooters inside out.",
  email: "hello@otrscooters.com", phone: "(03) 9000 1234", address: "12 Workshop Lane, Melbourne VIC",
  currency: CURRENCY, timezone: "Australia/Melbourne",
  locations: [{ name: "Main Workshop", address: "12 Workshop Lane, Melbourne VIC", phone: "(03) 9000 1234", email: "hello@otrscooters.com", is_default: true }],
  opening_hours: [{ day: "Mon – Fri", hours: "9:00 — 17:30" }, { day: "Saturday", hours: "10:00 — 15:00" }, { day: "Sunday", hours: "Closed" }],
  is_default: true,
};

const BOOKING_COPY = {
  eyebrow: "Book a Technician", title: "Tell us about your scooter",
  body: "Fill this in and we'll get back to confirm a time. No payment needed to book.",
  consentText: "I confirm the details are correct and consent to being contacted about this booking.",
  submitLabel: "Request Booking", successTitle: "Booking request received!",
  successBody: "Your request is now {status}. Our team will review it and confirm your appointment shortly.",
  successNote: "You'll receive updates by email and can track progress in the customer portal.",
  anotherLabel: "Submit another request",
};

const INVOICE_SETTINGS = { prefix: "INV", currency: CURRENCY, default_status: "outstanding", payment_statuses: [{ key: "unpaid", label: "Unpaid", color: "slate" }, { key: "outstanding", label: "Outstanding", color: "rose" }, { key: "paid", label: "Paid", color: "emerald" }, { key: "refunded", label: "Refunded", color: "amber" }], tax_label: "GST", tax_rate: 0 };
const PAYMENT_PROVIDER = { provider_key: "manual", display_name: "Manual payments", mode: "not_configured", active: false, settings: {} };
const QUOTE_TEMPLATE = { name: "Standard Quote", currency: CURRENCY, line_item_types: ["labour", "part", "fee", "discount"], fields: [{ key: "labour_estimate", label: "Labour estimate", type: "number" }, { key: "parts_estimate", label: "Parts estimate", type: "number" }, { key: "diagnosis_notes", label: "Diagnosis notes", type: "textarea" }, { key: "recommended_repair", label: "Recommended repair", type: "textarea" }], default_terms: "Quote is valid for 14 days unless stated otherwise." };

const SERVICE_CATEGORIES = [
  { key: "diagnostics", name: "Diagnostics", icon: "Activity" }, { key: "repairs", name: "Repairs", icon: "Wrench" },
  { key: "power", name: "Power", icon: "BatteryCharging" }, { key: "maintenance", name: "Maintenance", icon: "Wrench" },
  { key: "parts", name: "Parts", icon: "Package" }, { key: "sales", name: "Sales", icon: "ShoppingBag" }, { key: "booking", name: "Booking", icon: "Truck" },
];

const SERVICES = [
  { name: "Electric Scooter Diagnostics", category: "Diagnostics", category_key: "diagnostics", icon: "Activity", description: "Full electronic and mechanical health check to pinpoint faults fast." },
  { name: "Puncture & Tyre Repair", category: "Repairs", category_key: "repairs", icon: "CircleDot", description: "Tube, tyre and puncture fixes for solid and pneumatic wheels." },
  { name: "Brake Servicing", category: "Repairs", category_key: "repairs", icon: "Disc", description: "Brake adjustment, pad replacement and safety calibration." },
  { name: "Battery Checks & Replacement", category: "Power", category_key: "power", icon: "BatteryCharging", description: "Capacity testing, cell diagnostics and safe battery swaps." },
  { name: "Controller & Electrical Faults", category: "Diagnostics", category_key: "diagnostics", icon: "Cpu", description: "Wiring, controller and throttle fault diagnosis and repair." },
  { name: "General Servicing", category: "Maintenance", category_key: "maintenance", icon: "Wrench", description: "Tune-ups, tightening, lubrication and full safety inspection." },
  { name: "Parts Supply", category: "Parts", category_key: "parts", icon: "Package", description: "Genuine and compatible parts sourced for most major brands." },
  { name: "Scooter Sales", category: "Sales", category_key: "sales", icon: "ShoppingBag", description: "Quality new and refurbished electric scooters with warranty." },
  { name: "Pickup & Assessment Booking", category: "Booking", category_key: "booking", icon: "Truck", description: "We can collect your scooter and assess it at our workshop." },
];

const JOB_STATUSES = [
  { key: "requested", label: "Requested", group: "intake", color: "slate", is_default_intake: true },
  { key: "pending_confirmation", label: "Pending Confirmation", group: "intake", color: "amber" },
  { key: "active", label: "Active", group: "active", color: "indigo" },
  { key: "booked", label: "Booked", group: "active", color: "indigo" },
  { key: "technician_assigned", label: "Technician Assigned", group: "active", color: "indigo" },
  { key: "waiting_customer", label: "Waiting for Customer", group: "waiting", color: "amber" },
  { key: "waiting_technician", label: "Waiting for Technician", group: "waiting", color: "amber" },
  { key: "waiting_supplier", label: "Waiting for Supplier", group: "waiting", color: "amber" },
  { key: "waiting_parts", label: "Waiting for Parts", group: "waiting", color: "amber" },
  { key: "quote_required", label: "Quote Required", group: "quote", color: "violet" },
  { key: "quote_sent", label: "Quote Sent", group: "quote", color: "violet" },
  { key: "quote_approved", label: "Quote Approved", group: "quote", color: "emerald" },
  { key: "on_hold", label: "On Hold", group: "waiting", color: "slate" },
  { key: "repair_in_progress", label: "Repair In Progress", group: "active", color: "teal" },
  { key: "ready_for_pickup", label: "Ready for Pickup", group: "done", color: "emerald" },
  { key: "invoice_outstanding", label: "Invoice Outstanding", group: "billing", color: "rose" },
  { key: "paid", label: "Paid", group: "billing", color: "emerald" },
  { key: "completed", label: "Completed", group: "done", color: "emerald", is_terminal: true },
  { key: "cancelled", label: "Cancelled", group: "closed", color: "slate", is_terminal: true },
];

const JOB_TYPES = [
  { key: "repair", label: "Repair", description: "Repair or fault fix" },
  { key: "service", label: "Service", description: "General service or maintenance" },
  { key: "diagnostic", label: "Diagnostic", description: "Investigation or assessment" },
  { key: "sales", label: "Sales", description: "Sales or purchase support" },
  { key: "pickup", label: "Pickup / Assessment", description: "Collection or onsite assessment" },
];

const BOOKING_FIELDS = [
  { key: "customer_name", label: "Your name", placeholder: "Liam Carter", field_type: "text", required: true, maps_to: "customer_name", order: 0 },
  { key: "phone", label: "Phone", placeholder: "04xx xxx xxx", field_type: "tel", required: true, maps_to: "customer_phone", order: 1 },
  { key: "email", label: "Email", placeholder: "you@email.com", field_type: "email", required: true, maps_to: "customer_email", order: 2 },
  { key: "asset_label", label: "Scooter make / model", placeholder: "Segway Ninebot Max G30", field_type: "text", required: true, maps_to: "asset_label", order: 3 },
  { key: "issue_description", label: "What's the issue?", placeholder: "Rear tyre puncture and brakes feel loose...", field_type: "textarea", required: true, maps_to: "issue_description", order: 4 },
  { key: "preferred_date", label: "Preferred date", field_type: "date", maps_to: "scheduled_date", order: 5 },
  { key: "preferred_time_window", label: "Preferred time", field_type: "select", maps_to: "preferred_time_window", order: 6, options: [{ value: "Morning (9–12)", label: "Morning (9–12)" }, { value: "Midday (12–3)", label: "Midday (12–3)" }, { value: "Afternoon (3–5:30)", label: "Afternoon (3–5:30)" }, { value: "Anytime", label: "Anytime" }] },
  { key: "location_preference", label: "Drop-off preference", field_type: "select", maps_to: "location_preference", order: 7, options: [{ value: "drop_off", label: "I'll drop it off" }, { value: "pickup", label: "Please pick it up" }, { value: "onsite", label: "On-site / mobile" }] },
  { key: "rideable", label: "Is the scooter rideable?", field_type: "boolean_select", maps_to: "rideable", order: 8, options: [{ value: "yes", label: "Yes, it rides" }, { value: "no", label: "No, it won't ride" }] },
  { key: "photo", label: "Photo (optional)", field_type: "file", maps_to: "attachment", order: 9 },
];

const NOTIFICATION_TEMPLATES = [
  { key: "booking_received", channel: "email", subject: "We received your booking", body: "Hi {customer_name}, your request {reference} has been received." },
  { key: "quote_sent", channel: "email", subject: "Your quote is ready", body: "Hi {customer_name}, your quote for {reference} is ready to review." },
  { key: "status_changed", channel: "email", subject: "Your job status changed", body: "Hi {customer_name}, {reference} is now {status}." },
  { key: "invoice_created", channel: "email", subject: "Your invoice is ready", body: "Hi {customer_name}, your invoice for {reference} is ready." },
];

const TECHS = [
  { full_name: "Mason Reid", short_name: "Mason R.", role: "technician", role_label: "Technician", color: "teal", active: true },
  { full_name: "Ella Turner", short_name: "Ella T.", role: "technician", role_label: "Technician", color: "indigo", active: true },
  { full_name: "Priya Nair", short_name: "Priya N.", role: "technician", role_label: "Technician", color: "violet", active: true },
];

const DEMO_JOBS = [
  { reference: "OTR-1042", customer_name: "Liam Carter", customer_email: "liam@example.com", customer_phone: "0411 222 333", asset_label: "Segway Ninebot Max G30", issue_description: "Rear tyre puncture and brake adjustment", status: "waiting_customer", waiting_reason: "customer", payment_status: "outstanding", quote_status: "sent", job_type: "repair", offset: 0 },
  { reference: "OTR-1043", customer_name: "Ava Singh", customer_email: "ava@example.com", customer_phone: "0422 333 444", asset_label: "Apollo City Pro", issue_description: "Battery not charging", status: "waiting_supplier", waiting_reason: "supplier", payment_status: "unpaid", quote_status: "sent", job_type: "diagnostic", offset: 1 },
  { reference: "OTR-1044", customer_name: "Noah Williams", customer_email: "noah@example.com", customer_phone: "0433 444 555", asset_label: "Xiaomi Mi Pro 2", issue_description: "Throttle fault and controller check", status: "repair_in_progress", payment_status: "unpaid", quote_status: "approved", job_type: "repair", offset: 0 },
  { reference: "OTR-1045", customer_name: "Sophie Nguyen", customer_email: "sophie@example.com", customer_phone: "0444 555 666", asset_label: "Dragon GTR V2", issue_description: "General service and brake pad replacement", status: "ready_for_pickup", payment_status: "paid", quote_status: "approved", job_type: "service", ready_for_pickup: true, offset: -1 },
  { reference: "OTR-1046", customer_name: "Daniel Kim", customer_email: "daniel@example.com", customer_phone: "0455 666 777", asset_label: "Pure Air Pro", issue_description: "Won't power on — diagnostic needed", status: "requested", payment_status: "unpaid", quote_status: "draft", job_type: "diagnostic", offset: 2 },
  { reference: "OTR-1047", customer_name: "Maya Foster", customer_email: "maya@example.com", customer_phone: "0466 777 888", asset_label: "Inokim Light 2", issue_description: "Annual service + tyre check", status: "active", payment_status: "unpaid", quote_status: "draft", job_type: "service", offset: 3 },
];

function isoDaysFromNow(d) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  // Hoisted so the catch block can log which step failed.
  let body = {};
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;
    body = await req.json().catch(() => ({}));
    const step = body.step || "all";

    const isSeeded = async () => {
      const done = await db.AppSetting.filter({ key: "seed_complete" }, "", 1);
      return done.length > 0;
    };

    const createIfNone = async (entity, query, data) => {
      const existing = await db[entity].filter(query, "", 1);
      if (existing.length === 0) return db[entity].create(data);
      return existing[0];
    };

    // Each step is idempotent (createIfNone guards), so re-running after a
    // partial failure is always safe.
    const steps = {
      business: async () => {
        await createIfNone("BusinessProfile", { is_default: true }, BUSINESS);
        await createIfNone("AppSetting", { key: "app" }, { key: "app", value: APP_SETTINGS, description: "Configurable platform terminology and UI labels", active: true });
        await createIfNone("BusinessSetting", { key: "booking_copy" }, { key: "booking_copy", value: BOOKING_COPY, active: true });
        await createIfNone("InvoiceSetting", {}, { ...INVOICE_SETTINGS, active: true });
        await createIfNone("PaymentProviderConfig", { provider_key: PAYMENT_PROVIDER.provider_key }, { ...PAYMENT_PROVIDER });
        await createIfNone("QuoteTemplate", { name: QUOTE_TEMPLATE.name }, { ...QUOTE_TEMPLATE, active: true });
      },
      services: async () => {
        for (const [i, item] of SERVICE_CATEGORIES.entries())
          await createIfNone("ServiceCategory", { key: item.key }, { ...item, order: i, active: true });
        for (const [i, item] of SERVICES.entries())
          await createIfNone("ServiceItem", { name: item.name }, { ...item, order: i, active: true });
      },
      statuses: async () => {
        for (const [i, item] of JOB_STATUSES.entries())
          await createIfNone("JobStatus", { key: item.key }, { ...item, order: i, active: true });
        for (const [i, item] of JOB_TYPES.entries())
          await createIfNone("JobType", { key: item.key }, { ...item, order: i, active: true });
      },
      booking: async () => {
        for (const field of BOOKING_FIELDS)
          await createIfNone("BookingFieldConfig", { key: field.key }, { ...field, active: true });
      },
      templates: async () => {
        for (const template of NOTIFICATION_TEMPLATES)
          await createIfNone("NotificationTemplate", { key: template.key, channel: template.channel }, { ...template, active: true });
      },
      demo: async () => {
        const existingJobs = await db.Job.list("-created_date", 1);
        if (existingJobs.length > 0) return;
        const staff = await db.StaffProfile.list("", 1);
        if (staff.length === 0)
          await db.StaffProfile.bulkCreate(TECHS);
        for (const j of DEMO_JOBS) {
          const { offset, asset_label, ...rest } = j;
          const job = await db.Job.create({ ...rest, asset_label, scheduled_date: isoDaysFromNow(offset) });
          if (j.quote_status !== "draft")
            await db.Quote.create({ job_id: job.id, labour_estimate: 80, parts_estimate: 45, total: 125, currency: CURRENCY, status: j.quote_status === "approved" ? "approved" : "sent", recommended_repair: j.issue_description, sent_date: new Date().toISOString() });
          if (j.payment_status === "outstanding" || j.payment_status === "paid")
            await db.Invoice.create({ job_id: job.id, number: `${INVOICE_SETTINGS.prefix}-${j.reference}`, amount: 125, currency: CURRENCY, status: j.payment_status });
        }
      },
      finish: async () => {
        await createIfNone("AppSetting", { key: "seed_complete" }, { key: "seed_complete", value: { at: new Date().toISOString() }, description: "Marks initial seeding as complete", active: true });
      },
    };

    if (step === "check") {
      return Response.json({ seeded: await isSeeded() });
    }

    if (step === "all") {
      if (await isSeeded()) return Response.json({ seeded: false, reason: "already_seeded" });
      for (const name of Object.keys(steps)) await steps[name]();
      return Response.json({ seeded: true });
    }

    if (!steps[step]) return Response.json({ error: `Unknown step: ${step}` }, { status: 400 });
    await steps[step]();
    return Response.json({ ok: true, step });
  } catch (error) {
    // Structured server-side error log — inspect in dashboard → Code → Functions → logs.
    // The raw message IS returned here (unlike other functions) because this
    // endpoint is admin-only and the setup screen surfaces it for troubleshooting.
    console.error("[seedPlatform] failed", JSON.stringify({ step: body?.step, message: error.message, stack: error.stack }));
    return Response.json({ error: error.message }, { status: 500 });
  }
});