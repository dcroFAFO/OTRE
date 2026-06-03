import { base44 } from "@/api/base44Client";
import { logAudit } from "./auditService";
import { DEFAULT_INTAKE_STATUS } from "@/config/jobConfig";
import { DEFAULT_BUSINESS } from "@/config/businessConfig";
import { DEFAULT_JOB_TYPE_KEY } from "@/config/platformConfig";

// Creates a booking request as a job in the configurable intake status.
// It does NOT auto-confirm — it enters DEFAULT_INTAKE_STATUS first.
export async function createBookingRequest(form) {
  const reference = `${DEFAULT_BUSINESS.slug.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const job = await base44.entities.Job.create({
    reference,
    customer_name: form.customer_name,
    customer_email: form.email,
    customer_phone: form.phone,
    scooter_label: form.asset_label || form.scooter_label,
    asset_label: form.asset_label || form.scooter_label,
    issue_description: form.issue_description,
    job_type: DEFAULT_JOB_TYPE_KEY,
    status: DEFAULT_INTAKE_STATUS,
    scheduled_date: form.preferred_date || null,
    preferred_time_window: form.preferred_time_window,
    rideable: form.rideable,
    location_preference: form.location_preference,
    business_slug: DEFAULT_BUSINESS.slug,
  });

  if (form.photo_url) {
    await base44.entities.Attachment.create({
      job_id: job.id,
      file_url: form.photo_url,
      file_name: "Customer upload",
      kind: "photo",
      visibility: "customer",
      uploaded_by_name: form.customer_name,
    });
  }

  await logAudit({
    eventType: "booking_created",
    jobId: job.id,
    summary: `Booking request received from ${form.customer_name}`,
    visibility: "system",
  });
  return job;
}