import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SLUG = 'otr-scooters';
const INTAKE_STATUS = 'requested';
const JOB_TYPE = 'repair';
const DEFAULT_PERMISSIONS = ['view_status', 'view_booking', 'add_note', 'upload_file'];
const encoder = new TextEncoder();

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function makeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function originFrom(req) {
  const origin = req.headers.get('origin');
  if (origin) return origin;
  const referer = req.headers.get('referer');
  if (referer) return new URL(referer).origin;
  return 'https://app.base44.com';
}

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

Deno.serve(async (req) => {
  const requestMeta = { fn: 'createBooking' };
  try {
    const base44 = createClientFromRequest(req);
    const form = await req.json();
    requestMeta.fields = Object.keys(form || {});

    if (!form.customer_name || !form.customer_email || !form.phone || !form.asset_label || !form.issue_description) {
      return Response.json({ error: 'Name, email, phone, scooter details and issue description are required.' }, { status: 400 });
    }

    const email = String(form.customer_email || '').trim().toLowerCase();
    const phone = normalizePhone(form.phone);
    const now = new Date().toISOString();
    const customerMatches = await base44.asServiceRole.entities.Customer.filter({ email }, '-created_date', 1);
    let customer = customerMatches[0] || null;

    if (!customer && phone) {
      const phoneMatches = await base44.asServiceRole.entities.Customer.filter({ phone }, '-created_date', 1);
      customer = phoneMatches[0] || null;
    }

    if (!customer) {
      customer = await base44.asServiceRole.entities.Customer.create({
        customer_id: `CUST-${Date.now()}`,
        name: form.customer_name,
        full_name: form.customer_name,
        email,
        phone,
        status: 'active',
        createdAt: now,
        last_activity_date: now,
      });
    } else {
      await base44.asServiceRole.entities.Customer.update(customer.id, {
        name: customer.name || form.customer_name,
        full_name: customer.full_name || form.customer_name,
        phone: customer.phone || phone,
        last_activity_date: now,
      });
    }

    const reference = `${SLUG.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const job = await base44.asServiceRole.entities.Job.create({
      reference,
      customerId: customer.id,
      customer_id: customer.id,
      customer_name: form.customer_name,
      customer_email: email,
      customer_phone: phone,
      asset_label: form.asset_label,
      scooterDetails: form.asset_label,
      scooter_details: form.asset_label,
      issueDescription: form.issue_description,
      issue_description: form.issue_description,
      source: 'public_booking',
      job_type: JOB_TYPE,
      status: INTAKE_STATUS,
      scheduled_date: form.asap ? null : (form.preferred_date || null),
      preferred_time_window: form.asap ? 'ASAP' : form.preferred_time_window,
      rideable: form.rideable,
      business_slug: SLUG,
      createdAt: now,
      updatedAt: now,
    });

    if (form.photo_url) {
      await base44.asServiceRole.entities.Attachment.create({
        job_id: job.id,
        customer_id: customer.id,
        file_url: form.photo_url,
        file_name: 'Customer upload',
        kind: 'photo',
        visibility: 'customer',
        uploaded_by_name: form.customer_name,
      });
    }

    const rawToken = makeToken();
    const tokenHash = await sha256(rawToken);
    await base44.asServiceRole.entities.PublicJobAccess.create({
      jobId: job.id,
      job_id: job.id,
      tokenHash,
      token_hash: tokenHash,
      permissions: DEFAULT_PERMISSIONS,
      createdAt: now,
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      event_type: 'booking_created',
      job_id: job.id,
      customer_id: customer.id,
      actor_name: form.customer_name,
      actor_role: 'customer',
      summary: `Public booking request received from ${form.customer_name}`,
      visibility: 'system',
    }).catch((auditErr) => console.warn('[createBooking] audit log skipped:', auditErr.message));

    const trackingPath = `/track/${encodeURIComponent(job.id)}?token=${encodeURIComponent(rawToken)}`;
    const trackingLink = `${originFrom(req)}${trackingPath}`;
    return Response.json({ job, customer, trackingLink, trackingPath });
  } catch (error) {
    console.error('[createBooking] FAILED:', JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    return Response.json({ error: error.message || "Sorry — we couldn't submit your booking just now. Please try again." }, { status: 500 });
  }
});