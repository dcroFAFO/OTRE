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

    const db = base44.asServiceRole.entities;
    const reference = `${SLUG.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // Identity comes from the authenticated account, not from form input.
    const job = await db.Job.create({
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
      created_by_id: user.id,
    });

    if (form.photo_url) {
      await db.Attachment.create({
        job_id: job.id,
        file_url: form.photo_url,
        file_name: "Customer upload",
        kind: "photo",
        visibility: "customer",
        uploaded_by_name: user.full_name,
        created_by_id: user.id,
      });
    }

    await db.AuditEvent.create({
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
    console.error("CREATEBOOKING_FAIL message=" + error.message);
    console.error("[createBooking] request failed", JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    return Response.json({ error: "Sorry — we couldn't submit your booking just now. Please try again." }, { status: 500 });
  }
});