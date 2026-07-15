export const DEFAULT_BUSINESS = {
  name: "On The Run Electrics",
  legalName: "On The Run Electrics",
  tagline: "Don’t Stop. Get Back On The Run.",
  subheading: "Fast, reliable electric scooter repairs, servicing, and diagnostics to keep your ride safe, road-ready, and moving.",
  email: "hello@ontherunelectrics.com.au",
  phone: "0415 505 908",
  address: "11 Lucinda Street, Wooloongabba QLD 4102",
  currency: "AUD",
  timezone: "Australia/Melbourne",
  locations: [
    { name: "Main Workshop", address: "11 Lucinda Street, Wooloongabba QLD 4102", phone: "0415 505 908", email: "hello@ontherunelectrics.com.au", is_default: true },
  ],
  openingHours: [
    { day: "Monday – Sunday", hours: "11:00 AM – 7:30 PM" },
  ],
  primaryCta: { label: "Book a Repair", target: "/book" },
  secondaryCta: { label: "View Services", target: "#services" },
};

export const DEFAULT_APP_SETTINGS = {
  terminology: {
    platformLabel: "Job Platform",
    jobSingular: "job",
    jobPlural: "jobs",
    customerSingular: "customer",
    assetSingular: "scooter",
    assetPlural: "scooters",
    serviceRequestLabel: "booking request",
    readyStateLabel: "Ready for pickup",
    operationalAreaLabel: "workshop",
  },
  landing: {
    navLinks: [
      { label: "Services", href: "#services" },
      { label: "Common issues", href: "#common-issues" },
      { label: "How it works", href: "#journey" },
      { label: "News and Events", href: "/blog" },
      { label: "Book a repair", href: "/book" },
    ],
    heroEyebrow: "Repairs · Servicing · Diagnostics",
    heroBenefits: ["Repairs", "Servicing", "Diagnostics & maintenance"],
    servicesEyebrow: "Repairs & Services",
    servicesTitle: "Repairs & Services",
    servicesBody: "From routine servicing to fault finding and major repairs, On The Run Electrics helps keep your electric scooter safe, reliable, and ready to ride. Whether you need brake adjustments, tyre changes, battery diagnostics, electrical repairs, or a full service, we make the process simple with clear updates and practical advice from start to finish.",
    journeyEyebrow: "How it works",
    journeyTitle: "How It Works",
    journeyBody: "Tell us what is wrong with your scooter and book your repair online. Bring your scooter in for inspection, and we will assess the issue, complete the required work, and keep you updated as the job progresses. Once your repair is underway, you can track the status of your job online, so you know where things are at without needing to chase updates. When your scooter is ready, we will let you know it is time for pickup.",
    portalLabel: "Login",
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
  { key: "request", label: "Request", icon: "CalendarCheck" },
  { key: "repair", label: "Repair", icon: "Wrench" },
  { key: "pickup", label: "Pickup", icon: "PackageCheck" },
  { key: "pay", label: "Pay", icon: "CreditCard" },
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
  { name: "Brake Repairs", category: "Repairs", category_key: "repairs", icon: "Disc", description: "Brake adjustments, pad replacements, cable checks, and general braking system repairs to keep your scooter stopping safely.", landingDescription: "Brake repairs cover adjustments, pad replacement, cable checks and general braking faults. If your brakes feel weak, noisy or inconsistent during Brisbane riding, On The Run Electrics can restore more predictable stopping and keep you clearly updated through the repair." },
  { name: "Tyres & Punctures", category: "Repairs", category_key: "repairs", icon: "CircleDot", description: "Tyre changes, tube replacements, puncture repairs, and checks for wear, damage, or unsafe riding conditions.", landingDescription: "We handle puncture repairs, tube replacements, tyre changes and checks for wear or damage. For riders dealing with a flat tyre or reduced grip around Brisbane and Woolloongabba, our practical repair process helps get the scooter road-ready again with less disruption." },
  { name: "Battery Diagnostics", category: "Diagnostics", category_key: "diagnostics", icon: "BatteryCharging", description: "Testing and inspection for charging issues, reduced range, power loss, and battery-related faults.", landingDescription: "Battery diagnostics investigate charging problems, reduced range, power loss and other battery-related faults. Brisbane riders may need this service when a scooter will not charge or no longer performs as expected, helping identify the likely issue before repair decisions are made." },
  { name: "Electrical Fault Finding", category: "Diagnostics", category_key: "diagnostics", icon: "Cpu", description: "Diagnosis of wiring faults, lighting issues, error codes, controller problems, throttle faults, and intermittent power issues.", landingDescription: "Electrical fault finding covers wiring, lights, error codes, controllers, throttles and intermittent power problems. When a scooter cuts out, will not start or shows an unexplained fault, On The Run Electrics provides focused electric scooter repairs in Brisbane with clear, practical next steps." },
  { name: "General Servicing", category: "Maintenance", category_key: "maintenance", icon: "Wrench", description: "Routine checks and maintenance covering brakes, tyres, bolts, lights, wiring, folding mechanisms, suspension, and overall ride safety.", landingDescription: "General servicing checks brakes, tyres, bolts, lights, wiring, folding mechanisms, suspension and overall ride safety. Regular electric scooter servicing in Woolloongabba can help daily riders address wear early and keep their scooter reliable for regular Brisbane travel." },
  { name: "Safety Checks", category: "Maintenance", category_key: "maintenance", icon: "Activity", description: "Practical inspections to identify worn, loose, damaged, or unsafe components before they become bigger problems.", landingDescription: "Safety checks inspect the scooter for worn, loose, damaged or unsafe components, especially when the ride feels different or after heavy use. This practical assessment helps Brisbane riders identify concerns early and understand what needs attention before those issues become larger repairs." },
];

export const DEFAULT_JOB_STATUSES = [
  { key: "requested", label: "Requested", group: "intake", color: "slate", is_default_intake: true },
  { key: "booked", label: "Booked", group: "active", color: "indigo" },
  { key: "repair_in_progress", label: "Repair In Progress", group: "active", color: "teal" },
  { key: "waiting_on_parts", label: "Waiting on Parts", group: "waiting", color: "amber" },
  { key: "ready_for_pickup", label: "Ready for Pickup", group: "done", color: "emerald" },
  { key: "invoice_sent", label: "Invoice Sent", group: "billing", color: "rose" },
  { key: "paid", label: "Paid", group: "billing", color: "emerald" },
  { key: "completed", label: "Completed", group: "done", color: "emerald", is_terminal: true },
  { key: "cancelled", label: "Cancelled", group: "closed", color: "slate", is_terminal: true },
  { key: "on_hold", label: "On Hold", group: "waiting", color: "slate" },
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
export const REOPEN_STATUS_KEY = "booked";

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

export const STAFF_ROLE_KEYS = ["admin", "technician"];

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
  { key: "estimate_sent", channel: "email", subject: "Your estimate is ready", body: "Hi {customer_name}, your estimate for {reference} is ready to review." },
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