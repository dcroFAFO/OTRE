import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SLUG = 'otr-scooters';
const INTAKE_STATUS = 'requested';
const JOB_TYPE = 'repair';
const DEFAULT_PERMISSIONS = ['view_status', 'view_booking', 'add_note', 'upload_file', 'view_invoice', 'pay_invoice'];
const DEFAULT_SERVICE_TYPE = 'general_repair';
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

function bookingMake(form) {
  return form.scooterMake || form.scooterBrand || (form.asset_make === 'Other' ? form.asset_custom_make : form.asset_make) || '';
}

function bookingModel(form) {
  return form.scooterModel || (form.asset_model === 'Other' ? form.asset_custom_model : form.asset_model) || '';
}

function classifyServiceType(text = '') {
  const value = String(text).toLowerCase();
  if (/puncture|tyre|tire|tube/.test(value)) return 'puncture_tyres';
  if (/brake|rotor|pad/.test(value)) return 'brakes';
  if (/battery|range|charging|charger|charge/.test(value)) return 'battery';
  if (/controller|error code|fault code/.test(value)) return 'controller_electronics';
  if (/display|dashboard|screen/.test(value)) return 'display_dashboard';
  if (/throttle/.test(value)) return 'throttle';
  if (/wiring|cable|connector/.test(value)) return 'wiring';
  if (/water|rain|corrosion/.test(value)) return 'water_damage';
  if (/service|maintenance/.test(value)) return 'service_maintenance';
  if (/diagnostic|diagnosis|inspect|assessment/.test(value)) return 'diagnostic';
  if (/warranty/.test(value)) return 'warranty';
  if (/custom|modify|modification/.test(value)) return 'custom_work';
  return DEFAULT_SERVICE_TYPE;
}

function bookingSnapshot(form, email, phone) {
  const make = bookingMake(form);
  const model = bookingModel(form);
  const files = [form.photo_url, ...(Array.isArray(form.file_urls) ? form.file_urls : []), ...(Array.isArray(form.files) ? form.files : [])].filter(Boolean);
  const issueText = [form.issue_description, form.serviceRequested, form.issue_type].filter(Boolean).join(' ');
  return {
    customerName: form.customer_name || form.customerName || '',
    customerEmail: email || form.customer_email || form.customerEmail || '',
    customerPhone: phone || form.phone || form.customerPhone || '',
    scooterMake: make,
    scooterBrand: make,
    scooterModel: model,
    assetLabel: form.asset_label || [make, model].filter(Boolean).join(' '),
    issueOrService: form.issue_description || form.serviceRequested || '',
    issueDescription: form.issue_description || '',
    serviceRequested: form.serviceRequested || form.issue_type || '',
    serviceType: form.service_type || classifyServiceType(issueText),
    preferredDate: form.preferred_date || form.preferredDate || '',
    preferredTimeWindow: form.preferred_time_window || form.preferredTimeWindow || '',
    isRideable: typeof form.rideable === 'boolean' ? form.rideable : form.isRideable,
    asap: !!form.asap,
    photos: files,
    files,
    submittedAt: new Date().toISOString(),
  };
}

async function sendMail({ to, subject, body }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY not set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'OTR Scooters <hello@ontherunelectrics.com.au>',
      to: [to],
      subject,
      html: body,
    }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${await res.text()}`);
  return res.json();
}

async function sendSms({ to, body }) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!accountSid || !authToken || !from) throw new Error('Twilio SMS secrets are not set');
  if (!to) return null;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio SMS failed: ${await res.text()}`);
  return res.json();
}

function customerConfirmationSms(job, trackingLink) {
  const reference = job.reference ? ` (${job.reference})` : '';
  return `On The Run Electrics: Thanks, we've received your scooter repair booking${reference}. Track your request here: ${trackingLink}`;
}

function customerConfirmationHtml(job, trackingLink) {
  const assetLabel = job.asset_label || job.scooter_label || '—';
  const firstName = (job.customer_name || 'there').split(' ')[0];
  const reference = job.reference || '—';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">OTR Scooters</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Booking Confirmed</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Thanks for your booking request — we've received it and our team will be in touch shortly to confirm your appointment.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Reference:</strong> ${reference}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Scooter:</strong> ${assetLabel}</td></tr>
            ${job.issue_description ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Issue reported:</strong> ${job.issue_description}</td></tr>` : ''}
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border-radius:10px;background:#0ea5e9;">
            <a href="${trackingLink}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;">View my booking</a>
          </td></tr></table>
          <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.6;">This is your private tracking link. Keep it safe and don't share it publicly.</p>
          <p style="margin:16px 0 0;font-size:14px;color:#475569;line-height:1.6;">Questions? Reply to this email or call us and we'll be happy to help.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">OTR Scooters · 12 Workshop Lane, Melbourne VIC · hello@otrscooters.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
    let customer = null;
    try {
      const customerMatches = await base44.asServiceRole.entities.Customer.filter({ email }, '-created_date', 1);
      customer = customerMatches[0] || null;

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
    } catch (customerError) {
      console.warn('[createBooking] customer match/create skipped:', customerError.message);
    }

    const reference = `${SLUG.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const submittedBooking = bookingSnapshot(form, email, phone);
    const initialIntake = {
      customerName: submittedBooking.customerName,
      customerEmail: submittedBooking.customerEmail,
      customerPhone: submittedBooking.customerPhone,
      scooterMake: submittedBooking.scooterMake,
      scooterModel: submittedBooking.scooterModel,
      make: submittedBooking.scooterMake,
      model: submittedBooking.scooterModel,
      issueOrService: submittedBooking.issueOrService,
      initial_issue_notes: submittedBooking.issueOrService,
      service_type: submittedBooking.serviceType,
      date: submittedBooking.preferredDate,
      isRideable: submittedBooking.isRideable,
      booking_files: submittedBooking.files,
    };
    const job = await base44.asServiceRole.entities.Job.create({
      reference,
      customerId: customer?.id || null,
      customer_id: customer?.id || null,
      customer_name: form.customer_name,
      customer_email: email,
      customer_phone: phone,
      asset_label: form.asset_label || submittedBooking.assetLabel,
      scooterDetails: form.asset_label || submittedBooking.assetLabel,
      scooter_details: form.asset_label || submittedBooking.assetLabel,
      issueDescription: form.issue_description,
      issue_description: form.issue_description,
      source: 'public_booking',
      job_type: JOB_TYPE,
      service_type: submittedBooking.serviceType,
      priority: 'medium',
      status: INTAKE_STATUS,
      scheduled_date: form.asap ? null : (form.preferred_date || null),
      preferred_time_window: form.asap ? 'ASAP' : form.preferred_time_window,
      rideable: submittedBooking.isRideable,
      intake: initialIntake,
      booking_submission: submittedBooking,
      business_slug: SLUG,
      createdAt: now,
      updatedAt: now,
    });

    if (submittedBooking.files.length > 0) {
      await Promise.all(submittedBooking.files.map((fileUrl, index) => base44.asServiceRole.entities.Attachment.create({
        job_id: job.id,
        customer_id: customer?.id || null,
        file_url: fileUrl,
        file_name: `booking_upload_${index + 1}`,
        kind: 'photo',
        visibility: 'customer',
        uploaded_by_name: submittedBooking.customerName,
      })));
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
      customer_id: customer?.id || null,
      actor_name: form.customer_name,
      actor_role: 'customer',
      summary: `Public booking request received from ${form.customer_name}`,
      visibility: 'system',
    }).catch((auditErr) => console.warn('[createBooking] audit log skipped:', auditErr.message));

    const trackingPath = `/track/${encodeURIComponent(job.id)}?token=${encodeURIComponent(rawToken)}`;
    const trackingLink = `${originFrom(req)}${trackingPath}`;

    await sendMail({
      to: email,
      subject: `Booking confirmed${job.reference ? ` (${job.reference})` : ''} — OTR Scooters`,
      body: customerConfirmationHtml(job, trackingLink),
    }).catch((mailErr) => console.warn('[createBooking] customer confirmation email skipped:', mailErr.message));

    await sendSms({
      to: phone,
      body: customerConfirmationSms(job, trackingLink),
    }).catch((smsErr) => console.warn('[createBooking] customer confirmation SMS skipped:', smsErr.message));

    return Response.json({ job, customer, trackingLink, trackingPath });
  } catch (error) {
    console.error('[createBooking] FAILED:', JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    return Response.json({ error: error.message || "Sorry — we couldn't submit your booking just now. Please try again." }, { status: 500 });
  }
});