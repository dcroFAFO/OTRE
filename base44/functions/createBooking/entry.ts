import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Public booking intake. Runs with service role because customers submitting
// the landing-page form are not authenticated. Validates input server-side.

const SLUG = "otr-scooters";
const INTAKE_STATUS = "requested";
const JOB_TYPE = "repair";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const form = await req.json();

    if (!form.customer_name || !form.email || !form.issue_description) {
      return Response.json({ error: "customer_name, email and issue_description are required" }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const reference = `${SLUG.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const job = await db.Job.create({
      reference,
      customer_name: form.customer_name,
      customer_email: form.email,
      customer_phone: form.phone,
      scooter_label: form.asset_label || form.scooter_label,
      asset_label: form.asset_label || form.scooter_label,
      issue_description: form.issue_description,
      job_type: JOB_TYPE,
      status: INTAKE_STATUS,
      scheduled_date: form.preferred_date || null,
      preferred_time_window: form.preferred_time_window,
      rideable: form.rideable,
      location_preference: form.location_preference,
      business_slug: SLUG,
    });

    if (form.photo_url) {
      await db.Attachment.create({
        job_id: job.id,
        file_url: form.photo_url,
        file_name: "Customer upload",
        kind: "photo",
        visibility: "customer",
        uploaded_by_name: form.customer_name,
      });
    }

    await db.AuditEvent.create({
      event_type: "booking_created",
      job_id: job.id,
      actor_name: "System",
      actor_role: "system",
      summary: `Booking request received from ${form.customer_name}`,
      visibility: "system",
    });

    return Response.json(job);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});