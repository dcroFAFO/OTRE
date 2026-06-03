import { base44 } from "@/api/base44Client";
import { DEFAULT_BUSINESS, DEFAULT_SERVICES } from "@/config/businessConfig";
import { logAudit } from "./auditService";

// Seeds OTR demo data once. Safe to call repeatedly — checks if data exists.
function isoDaysFromNow(d) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

const TECHS = [
  { full_name: "Mason Reid", short_name: "Mason R.", role: "technician", color: "teal", active: true },
  { full_name: "Ella Turner", short_name: "Ella T.", role: "technician", color: "indigo", active: true },
  { full_name: "Priya Nair", short_name: "Priya N.", role: "employee", color: "violet", active: true },
];

const DEMO_JOBS = [
  { reference: "OTR-1042", customer_name: "Liam Carter", customer_email: "liam@example.com", customer_phone: "0411 222 333", scooter_label: "Segway Ninebot Max G30", issue_description: "Rear tyre puncture and brake adjustment", status: "waiting_customer", waiting_reason: "customer", assigned_technician_name: "Mason R.", payment_status: "outstanding", quote_status: "sent", job_type: "repair", offset: 0 },
  { reference: "OTR-1043", customer_name: "Ava Singh", customer_email: "ava@example.com", customer_phone: "0422 333 444", scooter_label: "Apollo City Pro", issue_description: "Battery not charging", status: "waiting_supplier", waiting_reason: "supplier", assigned_technician_name: "Ella T.", payment_status: "unpaid", quote_status: "sent", job_type: "diagnostic", offset: 1 },
  { reference: "OTR-1044", customer_name: "Noah Williams", customer_email: "noah@example.com", customer_phone: "0433 444 555", scooter_label: "Xiaomi Mi Pro 2", issue_description: "Throttle fault and controller check", status: "repair_in_progress", assigned_technician_name: "Mason R.", payment_status: "unpaid", quote_status: "approved", job_type: "repair", offset: 0 },
  { reference: "OTR-1045", customer_name: "Sophie Nguyen", customer_email: "sophie@example.com", customer_phone: "0444 555 666", scooter_label: "Dragon GTR V2", issue_description: "General service and brake pad replacement", status: "ready_for_pickup", assigned_technician_name: "Ella T.", payment_status: "paid", quote_status: "approved", job_type: "service", ready_for_pickup: true, offset: -1 },
  { reference: "OTR-1046", customer_name: "Daniel Kim", customer_email: "daniel@example.com", customer_phone: "0455 666 777", scooter_label: "Pure Air Pro", issue_description: "Won't power on — diagnostic needed", status: "requested", payment_status: "unpaid", quote_status: "draft", job_type: "diagnostic", offset: 2 },
  { reference: "OTR-1047", customer_name: "Maya Foster", customer_email: "maya@example.com", customer_phone: "0466 777 888", scooter_label: "Inokim Light 2", issue_description: "Annual service + tyre check", status: "technician_assigned", assigned_technician_name: "Priya N.", payment_status: "unpaid", quote_status: "draft", job_type: "service", offset: 3 },
];

export async function seedIfEmpty() {
  const existing = await base44.entities.Job.list("-created_date", 1);
  if (existing.length > 0) return false;

  // Business profile
  const profiles = await base44.entities.BusinessProfile.filter({ slug: DEFAULT_BUSINESS.slug }, "", 1);
  if (profiles.length === 0) {
    await base44.entities.BusinessProfile.create({
      slug: DEFAULT_BUSINESS.slug, name: DEFAULT_BUSINESS.name, legal_name: DEFAULT_BUSINESS.legalName,
      tagline: DEFAULT_BUSINESS.tagline, subheading: DEFAULT_BUSINESS.subheading, email: DEFAULT_BUSINESS.email,
      phone: DEFAULT_BUSINESS.phone, address: DEFAULT_BUSINESS.address, opening_hours: DEFAULT_BUSINESS.openingHours, is_default: true,
    });
  }

  // Services
  const svc = await base44.entities.ServiceItem.list("", 1);
  if (svc.length === 0) {
    await base44.entities.ServiceItem.bulkCreate(DEFAULT_SERVICES.map((s, i) => ({ ...s, order: i, active: true })));
  }

  // Staff
  const staff = await base44.entities.StaffProfile.list("", 1);
  if (staff.length === 0) await base44.entities.StaffProfile.bulkCreate(TECHS);

  // Jobs + audit
  for (const j of DEMO_JOBS) {
    const { offset, ...rest } = j;
    const job = await base44.entities.Job.create({ ...rest, scheduled_date: isoDaysFromNow(offset), business_slug: DEFAULT_BUSINESS.slug });
    await logAudit({ eventType: "booking_created", jobId: job.id, summary: `Booking created for ${job.customer_name}`, visibility: "system" });
    if (j.quote_status !== "draft") {
      await base44.entities.Quote.create({ job_id: job.id, labour_estimate: 80, parts_estimate: 45, total: 125, status: j.quote_status === "approved" ? "approved" : "sent", recommended_repair: j.issue_description, sent_date: new Date().toISOString() });
    }
    if (j.payment_status === "outstanding" || j.payment_status === "paid") {
      await base44.entities.Invoice.create({ job_id: job.id, number: `INV-${j.reference}`, amount: 125, status: j.payment_status });
    }
  }
  return true;
}