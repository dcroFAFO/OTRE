import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Authenticated booking intake. The customer must be signed in (Google / Microsoft /
// Facebook / Apple / email) — the job is linked to their authenticated identity
// (email + created_by_id) so they can track and manage only their own jobs.

const SLUG = "otr-scooters";
const INTAKE_STATUS = "requested";
const JOB_TYPE = "repair";

Deno.serve(async (req) => {
  const requestMeta = { fn: "createBooking" };
  try {
    const base44 = createClientFromRequest(req);

    // Require a signed-in user — bookings can no longer be made anonymously.
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (!user) {
      return Response.json({ error: "You must be signed in to make a booking." }, { status: 401 });
    }

    const form = await req.json();
    requestMeta.fields = Object.keys(form || {});

    if (!form.asset_label || !form.issue_description) {
      return Response.json({ error: "asset_label and issue_description are required" }, { status: 400 });
    }

    const reference = `${SLUG.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // Create the job and attachment as the authenticated customer — RLS allows a
    // user to create their own job (data.customer_email === their email).
    const job = await base44.entities.Job.create({
      reference,
      customer_name: form.customer_name || user.full_name,
      customer_email: user.email,
      customer_phone: form.phone,
      scooter_label: form.asset_label,
      asset_label: form.asset_label,
      issue_description: form.issue_description,
      job_type: JOB_TYPE,
      status: INTAKE_STATUS,
      scheduled_date: form.asap ? null : (form.preferred_date || null),
      preferred_time_window: form.asap ? "ASAP" : form.preferred_time_window,
      rideable: form.rideable,
      business_slug: SLUG,
    });

    if (form.photo_url) {
      await base44.entities.Attachment.create({
        job_id: job.id,
        file_url: form.photo_url,
        file_name: "Customer upload",
        kind: "photo",
        visibility: "customer",
        uploaded_by_name: user.full_name,
      });
    }

    // Audit log is system-written, so it stays on the service role (customers
    // aren't permitted to write AuditEvent records directly).
    await base44.asServiceRole.entities.AuditEvent.create({
      event_type: "booking_created",
      job_id: job.id,
      actor_id: user.id,
      actor_name: user.full_name,
      actor_role: "customer",
      summary: `Booking request received from ${user.full_name}`,
      visibility: "system",
    });

    return Response.json(job);
  } catch (error) {
    console.error("[createBooking] request failed", JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    return Response.json({ error: "Sorry — we couldn't submit your booking just now. Please try again." }, { status: 500 });
  }
});