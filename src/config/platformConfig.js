export const DEFAULT_BUSINESS = {
  name: "On The Run Electrics",
  legalName: "On The Run Electrics",
  tagline: "Expert electric scooter repairs, servicing, and sales.",
  subheading: "From puncture fixes and battery replacements to full diagnostics and brand-new scooters — handled by specialists who know e-scooters inside out.",
  email: "hello@otrscooters.com",
  phone: "(03) 9000 1234",
  address: "12 Workshop Lane, Melbourne VIC",
  currency: "AUD",
  timezone: "Australia/Melbourne",
  locations: [
    { name: "Main Workshop", address: "12 Workshop Lane, Melbourne VIC", phone: "(03) 9000 1234", email: "hello@otrscooters.com", is_default: true },
  ],
  openingHours: [
    { day: "Mon – Fri", hours: "9:00 — 17:30" },
    { day: "Saturday", hours: "10:00 — 15:00" },
    { day: "Sunday", hours: "Closed" },
  ],
  primaryCta: { label: "View Services", target: "#services" },
  secondaryCta: { label: "Book a Technician", target: "#book" },
};

export const DEFAULT_APP_SETTINGS = {
  terminology: {
    platformLabel: "Job Platform",
    jobSingular: "job",
    jobPlural: "jobs",
    customerSingular: "customer",
    staffAssignmentLabel: "Technician",
    staffAssignmentLabelPlural: "Technicians",
    assetSingular: "scooter",
    assetPlural: "scooters",
    serviceRequestLabel: "booking request",
    readyStateLabel: "Ready for pickup",
    operationalAreaLabel: "workshop",
  },
  landing: {
    navLinks: [
      { label: "Services", href: "#services" },
      { label: "How it works", href: "#journey" },
      { label: "Book a repair", href: "/book" },
    ],
    heroEyebrow: "Repairs · Servicing · Sales",
    heroBenefits: ["All major brands serviced", "Genuine & compatible parts", "Transparent fixed-price quotes"],
    servicesEyebrow: "What we do",
    servicesTitle: "Everything your scooter needs, in one place",
    servicesBody: "From quick puncture fixes to full electrical diagnostics and brand-new scooters — handled by people who know e-scooters inside out.",
    journeyEyebrow: "How it works",
    journeyTitle: "From drop-off to pickup — always in the loop",
    journeyBody: "Every job moves through clear, tracked stages. You'll know exactly where your scooter is at all times.",
    portalLabel: "Customer Portal",
  },
  dashboard: {
    nav: {
      overview: "Overview",
      jobs: "Jobs",
      calendar: "Calendar",
    },
    overviewSubtitle: "Everything happening across your workshop right now.",
    metrics: {
      active: "Active jobs",
      awaitingCustomer: "Awaiting customer",
      waitingParts: "Waiting for parts",
      readyPickup: "Ready for pickup",
      outstanding: "Invoice outstanding",
      completedWeek: "Completed this week",
      requested: "Bookings requested",
      total: "Total jobs",
    },
  },
};

export const CUSTOMER_JOURNEY = [
  { key: "book", label: "Book assessment", icon: "CalendarCheck" },
  { key: "assigned", label: "Technician assigned", icon: "UserCheck" },
  { key: "inspected", label: "Scooter inspected", icon: "Search" },
  { key: "quote", label: "Quote generated", icon: "FileText" },
  { key: "approval", label: "Awaiting approval", icon: "Clock" },
  { key: "progress", label: "Repair in progress", icon: "Wrench" },
  { key: "pickup", label: "Ready for pickup", icon: "PackageCheck" },
  { key: "paid", label: "Invoice paid", icon: "CreditCard" },
];

export const DEFAULT_SERVICE_CATEGORIES = [
  { key: "diagnostics", name: "Diagnostics", icon: "Activity", order: 0 },
  { key: "repairs", name: "Repairs", icon: "Wrench", order: 1 },
  { key: "power", name: "Power", icon: "BatteryCharging", order: 2 },
  { key: "maintenance", name: "Maintenance", icon: "Wrench", order: 3 },
  { key: "parts", name: "Parts", icon: "Package", order: 4 },
  { key: "sales", name: "Sales", icon: "ShoppingBag", order: 5 },
];

export const DEFAULT_SERVICES = [
  { name: "Electric Scooter Diagnostics", category: "Diagnostics", category_key: "diagnostics", icon: "Activity", description: "Full electronic and mechanical health check to pinpoint faults fast." },
  { name: "Puncture & Tyre Repair", category: "Repairs", category_key: "repairs", icon: "CircleDot", description: "Tube, tyre and puncture fixes for solid and pneumatic wheels." },
  { name: "Brake Servicing", category: "Repairs", category_key: "repairs", icon: "Disc", description: "Brake adjustment, pad replacement and safety calibration." },
  { name: "Battery Checks & Replacement", category: "Power", category_key: "power", icon: "BatteryCharging", description: "Capacity testing, cell diagnostics and safe battery swaps." },
  { name: "Controller & Electrical Faults", category: "Diagnostics", category_key: "diagnostics", icon: "Cpu", description: "Wiring, controller and throttle fault diagnosis and repair." },
  { name: "General Servicing", category: "Maintenance", category_key: "maintenance", icon: "Wrench", description: "Tune-ups, tightening, lubrication and full safety inspection." },
  { name: "Parts Supply", category: "Parts", category_key: "parts", icon: "Package", description: "Genuine and compatible parts sourced for most major brands." },
  { name: "Scooter Sales", category: "Sales", category_key: "sales", icon: "ShoppingBag", description: "Quality new and refurbished electric scooters with warranty." },
];

export const DEFAULT_JOB_STATUSES = [
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

export const DEFAULT_JOB_TYPES = [
  { key: "repair", label: "Repair", description: "Repair or fault fix" },
  { key: "service", label: "Service", description: "General service or maintenance" },
  { key: "diagnostic", label: "Diagnostic", description: "Investigation or assessment" },
  { key: "sales", label: "Sales", description: "Sales or purchase support" },
];

export const DEFAULT_JOB_TYPE_KEY = "repair";
export const DEFAULT_INTAKE_STATUS = "requested";
export const READY_STATUS_KEY = "ready_for_pickup";
export const COMPLETE_STATUS_KEY = "completed";
export const CANCELLED_STATUS_KEY = "cancelled";
export const REOPEN_STATUS_KEY = "active";

export const DEFAULT_WAITING_REASONS = [
  { key: "customer", label: "Customer" },
  { key: "technician", label: "Technician" },
  { key: "supplier", label: "Supplier" },
  { key: "parts", label: "Parts" },
];

export const DEFAULT_PAYMENT_STATUSES = [
  { key: "unpaid", label: "Unpaid", color: "slate" },
  { key: "outstanding", label: "Outstanding", color: "rose" },
  { key: "paid", label: "Paid", color: "emerald" },
  { key: "refunded", label: "Refunded", color: "amber" },
];

export const DEFAULT_QUOTE_STATUSES = [
  { key: "draft", label: "Draft", color: "slate" },
  { key: "sent", label: "Sent", color: "violet" },
  { key: "approved", label: "Approved", color: "emerald" },
  { key: "rejected", label: "Rejected", color: "rose" },
];

export const DEFAULT_ROLES = {
  admin: { key: "admin", label: "Admin", is_staff: true },
  employee: { key: "employee", label: "Employee", is_staff: true },
  technician: { key: "technician", label: "Technician", is_staff: true },
  customer: { key: "customer", label: "Customer", is_staff: false },
};

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: ["*"],
  employee: ["job.view.all", "job.create", "job.update", "job.status.change", "job.assign", "job.reschedule", "job.note.internal", "job.note.customer", "job.attach", "job.quote.manage", "job.invoice.manage", "job.payment.manage", "job.cancel", "job.reopen", "job.archive", "calendar.manage", "dashboard.view"],
  technician: ["job.view.assigned", "job.status.change", "job.note.internal", "job.note.customer", "job.attach", "job.checklist.update", "dashboard.view"],
  customer: ["job.view.own", "quote.approve", "quote.reject", "customer.upload", "customer.message", "invoice.pay"],
};

export const STAFF_ROLE_KEYS = ["admin", "employee", "technician"];

export const DEFAULT_BOOKING_FIELDS = [
  { key: "customer_name", label: "Your name", placeholder: "Liam Carter", field_type: "text", required: true, maps_to: "customer_name", order: 0 },
  { key: "phone", label: "Phone", placeholder: "04xx xxx xxx", field_type: "tel", required: true, maps_to: "customer_phone", order: 1 },
  { key: "email", label: "Email", placeholder: "you@email.com", field_type: "email", required: true, maps_to: "customer_email", order: 2 },
  { key: "asset_label", label: "Scooter make / model", placeholder: "Segway Ninebot Max G30", field_type: "text", required: true, maps_to: "asset_label", order: 3 },
  { key: "issue_description", label: "What's the issue?", placeholder: "Rear tyre puncture and brakes feel loose...", field_type: "textarea", required: true, maps_to: "issue_description", order: 4 },
  { key: "preferred_date", label: "Preferred date", field_type: "date", maps_to: "scheduled_date", order: 5 },
  { key: "preferred_time_window", label: "Preferred time", field_type: "select", maps_to: "preferred_time_window", order: 6, options: [
    { value: "Morning (9–12)", label: "Morning (9–12)" },
    { value: "Midday (12–3)", label: "Midday (12–3)" },
    { value: "Afternoon (3–5:30)", label: "Afternoon (3–5:30)" },
    { value: "Anytime", label: "Anytime" }
  ]},
  { key: "rideable", label: "Is the scooter rideable?", field_type: "boolean_select", maps_to: "rideable", order: 8, options: [
    { value: "yes", label: "Yes, it rides" },
    { value: "no", label: "No, it won't ride" }
  ]},
  { key: "photo", label: "Photo (optional)", field_type: "file", maps_to: "attachment", order: 9 },
];

export const DEFAULT_BOOKING_COPY = {
  eyebrow: "Book a Technician",
  title: "Tell us about your scooter",
  body: "Fill this in and we'll get back to confirm a time. No payment needed to book.",
  consentText: "I confirm the details are correct and consent to being contacted about this booking.",
  submitLabel: "Request Booking",
  successTitle: "Booking request received!",
  successBody: "Your request is now {status}. Our team will review it and confirm your appointment shortly.",
  successNote: "You'll receive updates by email and can track progress in the customer portal.",
  anotherLabel: "Submit another request",
};

export const DEFAULT_QUOTE_TEMPLATE = {
  name: "Standard Quote",
  currency: "AUD",
  line_item_types: ["labour", "part", "fee", "discount"],
  fields: [
    { key: "labour_estimate", label: "Labour estimate", type: "number" },
    { key: "parts_estimate", label: "Parts estimate", type: "number" },
    { key: "diagnosis_notes", label: "Diagnosis notes", type: "textarea" },
    { key: "recommended_repair", label: "Recommended repair", type: "textarea" },
  ],
  default_terms: "Quote is valid for 14 days unless stated otherwise.",
};

export const DEFAULT_INVOICE_SETTINGS = {
  prefix: "INV",
  currency: "AUD",
  default_status: "outstanding",
  payment_statuses: DEFAULT_PAYMENT_STATUSES,
  tax_label: "GST",
  tax_rate: 0,
};

export const DEFAULT_PAYMENT_PROVIDER_CONFIG = {
  provider_key: "manual",
  display_name: "Manual payments",
  mode: "not_configured",
  active: false,
  settings: {},
};

export const DEFAULT_NOTIFICATION_TEMPLATES = [
  { key: "booking_received", channel: "email", subject: "We received your booking", body: "Hi {customer_name}, your request {reference} has been received." },
  { key: "quote_sent", channel: "email", subject: "Your quote is ready", body: "Hi {customer_name}, your quote for {reference} is ready to review." },
  { key: "status_changed", channel: "email", subject: "Your job status changed", body: "Hi {customer_name}, {reference} is now {status}." },
  { key: "invoice_created", channel: "email", subject: "Your invoice is ready", body: "Hi {customer_name}, your invoice for {reference} is ready." },
];

// Standard turnaround target in days (created → completed). Used by the
// technician turnaround tracker to flag categories running over target.
export const DEFAULT_TURNAROUND_TARGET_DAYS = 3;

export const DEFAULT_DEMO_PREVIEW_JOB = {
  reference: "OTR-1042",
  assetLabel: "Segway Ninebot Max G30",
};