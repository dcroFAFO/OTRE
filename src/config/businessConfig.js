// Central business configuration. OTR Scooters is the DEFAULT business.
// Nothing here is hard-coded into business logic — change this object (or the
// BusinessProfile / AppSetting entities at runtime) to re-skin for any business.

export const DEFAULT_BUSINESS = {
  slug: "otr-scooters",
  name: "OTR Scooters",
  legalName: "On The Run Scooters",
  tagline: "Electric scooter repairs, servicing, and sales — made simple.",
  subheading:
    "Book a technician, track your repair, approve quotes, and stay updated from drop-off to pickup.",
  email: "hello@otrscooters.com",
  phone: "(03) 9000 1234",
  address: "12 Workshop Lane, Melbourne VIC",
  openingHours: [
    { day: "Mon – Fri", hours: "9:00 — 17:30" },
    { day: "Saturday", hours: "10:00 — 15:00" },
    { day: "Sunday", hours: "Closed" },
  ],
  primaryCta: { label: "Book a Technician", target: "#book" },
  secondaryCta: { label: "View Services", target: "#services" },
};

// Customer journey cards shown in the animated hero.
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

// Default service catalogue (also seeded as ServiceItem entities).
export const DEFAULT_SERVICES = [
  { name: "Electric Scooter Diagnostics", category: "Diagnostics", icon: "Activity", description: "Full electronic and mechanical health check to pinpoint faults fast." },
  { name: "Puncture & Tyre Repair", category: "Repairs", icon: "CircleDot", description: "Tube, tyre and puncture fixes for solid and pneumatic wheels." },
  { name: "Brake Servicing", category: "Repairs", icon: "Disc", description: "Brake adjustment, pad replacement and safety calibration." },
  { name: "Battery Checks & Replacement", category: "Power", icon: "BatteryCharging", description: "Capacity testing, cell diagnostics and safe battery swaps." },
  { name: "Controller & Electrical Faults", category: "Diagnostics", icon: "Cpu", description: "Wiring, controller and throttle fault diagnosis and repair." },
  { name: "General Servicing", category: "Maintenance", icon: "Wrench", description: "Tune-ups, tightening, lubrication and full safety inspection." },
  { name: "Parts Supply", category: "Parts", icon: "Package", description: "Genuine and compatible parts sourced for most major brands." },
  { name: "Scooter Sales", category: "Sales", icon: "ShoppingBag", description: "Quality new and refurbished electric scooters with warranty." },
  { name: "Pickup & Assessment Booking", category: "Booking", icon: "Truck", description: "We can collect your scooter and assess it at our workshop." },
];