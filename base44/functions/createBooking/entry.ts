import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SLUG = 'otr-scooters';
const INTAKE_STATUS = 'requested';
const JOB_TYPE = 'repair';
const DEFAULT_PERMISSIONS = ['view_status', 'view_booking', 'add_note', 'upload_file', 'view_invoice', 'pay_invoice'];
const DEFAULT_SERVICE_TYPE = 'general_repair';
const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);
const E164_PATTERN = /^\+614\d{8}$/;
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
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return `+61${cleaned.replace(/\D/g, '')}`;
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
    customerEmail: email,
    customerPhone: phone,
    customerPhoneE164: phone,
    phoneCountryCode: '+61',
    scooterIssueSummary: form.scooter_issue_summary || '',
    scooterMakeModel: form.scooter_make_model || '',
    rideableStatus: form.rideable_status || '',
    urgencyOrSafetyNotes: form.urgency_or_safety_notes || '',
    suspectedServiceCategory: form.suspected_service_category || '',
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

function isCustomerUser(user) {
  return !!user?.id && !STAFF_ROLES.has(String(user.role || '').toLowerCase()) && user.is_customer !== false && user.data?.is_customer !== false;
}

async function currentUser(base44) {
  try { return await base44.auth.me(); } catch (_) { return null; }
}

async function findOrCreateProfile(base44, { name, email, phone, user, now }) {
  let profile = null;
  const emailMatches = await base44.asServiceRole.entities.CustomerProfile.filter({ email }, '-created_date', 1).catch(() => []);
  profile = emailMatches[0] || null;
  if (!profile && phone) {
    const phoneMatches = await base44.asServiceRole.entities.CustomerProfile.filter({ phone_e164: phone }, '-created_date', 1).catch(() => []);
    profile = phoneMatches[0] || null;
  }
  const authUserId = isCustomerUser(user) ? user.id : null;
  if (!profile) {
    profile = await base44.asServiceRole.entities.CustomerProfile.create({ name, email, phone_e164: phone, auth_user_id: authUserId || undefined, email_verified: !!authUserId, created_from_booking: true, created_at: now, updated_at: now });
  } else {
    const updates = { updated_at: now };
    if (!profile.name && name) updates.name = name;
    if (phone && profile.phone_e164 !== phone) updates.phone_e164 = phone;
    if (authUserId && !profile.auth_user_id) { updates.auth_user_id = authUserId; updates.email_verified = true; }
    if (Object.keys(updates).length > 1) { await base44.asServiceRole.entities.CustomerProfile.update(profile.id, updates); profile = { ...profile, ...updates }; }
  }
  return profile;
}

async function syncLegacyCustomer(base44, { profile, name, email, phone, user, now }) {
  try {
    const matches = await base44.asServiceRole.entities.Customer.filter({ email }, '-created_date', 1);
    const existing = matches[0] || null;
    const data = { customer_id: profile.id, name, full_name: name, email, phone, phone_e164: phone, phone_display: phone, phone_country_code: '+61', user_id: isCustomerUser(user) ? user.id : existing?.user_id, status: existing?.status || 'active', last_activity_date: now };
    if (existing) await base44.asServiceRole.entities.Customer.update(existing.id, data);
    else await base44.asServiceRole.entities.Customer.create({ ...data, createdAt: now });
  } catch (error) { console.warn('[createBooking] legacy customer sync skipped:', error.message); }
}

async function sendMail({ to, subject, body }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return null;
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'OTR Scooters <hello@ontherunelectrics.com.au>', to: [to], subject, html: body }) });
  if (!res.ok) throw new Error(`Resend send failed: ${await res.text()}`);
  return res.json();
}

async function sendSms({ to, body }) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!accountSid || !authToken || !from || !to) return null;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ From: from, To: to, Body: body }) });
  if (!res.ok) throw new Error(`Twilio SMS failed: ${await res.text()}`);
  return res.json();
}

function customerConfirmationSms(job, manageLink) {
  const reference = job.reference ? ` (${job.reference})` : '';
  return manageLink
    ? `On The Run Electrics: Thanks, we've received your scooter repair booking${reference}. View it in your customer portal: ${manageLink}`
    : `On The Run Electrics: Thanks, we've received your scooter repair booking${reference}. We will review it and keep you updated.`;
}

function customerConfirmationHtml(job, manageLink) {
  const assetLabel = job.asset_label || '—';
  const firstName = (job.customer_name || 'there').split(' ')[0];
  const reference = job.reference || '—';
  const portalButton = manageLink ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border-radius:10px;background:#0ea5e9;"><a href="${manageLink}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;">View in Customer Portal</a></td></tr></table>` : '';
  const accountNote = manageLink ? 'You can manage this repair from your customer portal.' : 'We will send repair updates to the email address or mobile number on this booking.';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);"><tr><td style="background:#0f172a;padding:28px 32px;"><p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">OTR Scooters</p><h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Booking Confirmed</h1></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.6;">Hi ${firstName},</p><p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Your repair request has been submitted. We will review the details and send updates as the job progresses.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;"><tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Reference:</strong> ${reference}</td></tr><tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Scooter:</strong> ${assetLabel}</td></tr>${job.issue_description ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Issue reported:</strong> ${job.issue_description}</td></tr>` : ''}</table>${portalButton}<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">${accountNote}</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const requestMeta = { fn: 'createBooking' };
  try {
    const base44 = createClientFromRequest(req);
    const form = await req.json();
    const user = await currentUser(base44);
    requestMeta.fields = Object.keys(form || {});

    if (!form.customer_name || !form.customer_email || !form.phone || !form.asset_label || !form.issue_description) return Response.json({ error: 'Name, email, phone, scooter details and issue description are required.' }, { status: 400 });
    const email = String(form.customer_email || '').trim().toLowerCase();
    const phone = normalizePhone(form.phone_e164 || form.customer_phone_e164 || form.phone);
    if (!E164_PATTERN.test(phone)) return Response.json({ error: 'Enter a valid Australian mobile number' }, { status: 400 });

    const now = new Date().toISOString();
    const profile = await findOrCreateProfile(base44, { name: form.customer_name, email, phone, user, now });
    await syncLegacyCustomer(base44, { profile, name: form.customer_name, email, phone, user, now });

    const customerUserId = isCustomerUser(user) ? user.id : null;
    const rawToken = customerUserId ? null : makeToken();
    const reference = `${SLUG.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const submittedBooking = bookingSnapshot(form, email, phone);
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
      display_name: profile.display_name || form.customer_name,
      name: profile.name || form.customer_name,
      full_name: profile.full_name || form.customer_name,
      scooter_make: submittedBooking.scooterMake || profile.scooter_make || '',
      scooter_model: submittedBooking.scooterModel || profile.scooter_model || '',
      scooter_make_model: submittedBooking.assetLabel || profile.scooter_make_model || '',
      updated_at: now,
    }).catch((profileErr) => console.warn('[createBooking] profile details sync skipped:', profileErr.message));
    const initialIntake = { customerName: submittedBooking.customerName, customerEmail: submittedBooking.customerEmail, customerPhone: submittedBooking.customerPhone, customerPhoneE164: submittedBooking.customerPhoneE164, scooterMake: submittedBooking.scooterMake, scooterModel: submittedBooking.scooterModel, make: submittedBooking.scooterMake, model: submittedBooking.scooterModel, issueOrService: submittedBooking.issueOrService, initial_issue_notes: [submittedBooking.issueOrService, submittedBooking.urgencyOrSafetyNotes].filter(Boolean).join('\n'), service_type: submittedBooking.serviceType, date: submittedBooking.preferredDate, isRideable: submittedBooking.isRideable, booking_files: submittedBooking.files };
    const job = await base44.asServiceRole.entities.Job.create({ reference, tracking_token: rawToken, guest_access_token: rawToken, customer_profile_id: profile.id, customer_user_id: customerUserId, customerId: profile.id, customer_id: profile.id, customer_account_id: customerUserId, claimed_by_customer: !!customerUserId, customer_name: form.customer_name, customer_email: email, customer_phone: phone, customer_phone_e164: phone, customer_phone_display: phone, asset_label: form.asset_label || submittedBooking.assetLabel, scooter_make_model: form.asset_label || submittedBooking.assetLabel, scooterDetails: form.asset_label || submittedBooking.assetLabel, scooter_details: form.asset_label || submittedBooking.assetLabel, issueDescription: form.issue_description, issue_description: form.issue_description, issue_summary: form.issue_description, rideable_status: submittedBooking.isRideable ? 'Rideable' : 'Not rideable', job_status: INTAKE_STATUS, source: 'public_booking', job_type: JOB_TYPE, service_type: submittedBooking.serviceType, priority: 'medium', status: INTAKE_STATUS, scheduled_date: form.asap ? null : (form.preferred_date || null), preferred_time_window: form.asap ? 'ASAP' : form.preferred_time_window, rideable: submittedBooking.isRideable, intake: initialIntake, booking_submission: submittedBooking, business_slug: SLUG, createdAt: now, created_at: now, updatedAt: now });

    if (submittedBooking.files.length > 0) await Promise.all(submittedBooking.files.map((fileUrl, index) => base44.asServiceRole.entities.Attachment.create({ job_id: job.id, customer_id: profile.id, file_url: fileUrl, file_name: `booking_upload_${index + 1}`, kind: 'photo', visibility: 'customer', uploaded_by_name: submittedBooking.customerName })));
    if (rawToken) { const tokenHash = await sha256(rawToken); await base44.asServiceRole.entities.PublicJobAccess.create({ jobId: job.id, job_id: job.id, tokenHash, token_hash: tokenHash, permissions: DEFAULT_PERMISSIONS, createdAt: now }); }
    await base44.asServiceRole.entities.AuditEvent.create({ event_type: 'booking_created', job_id: job.id, customer_id: profile.id, actor_name: form.customer_name, actor_role: customerUserId ? 'customer_account' : 'guest_customer', summary: `Booking request received from ${form.customer_name}`, visibility: 'system' }).catch((auditErr) => console.warn('[createBooking] audit log skipped:', auditErr.message));

    const origin = originFrom(req);
    const portalLink = customerUserId ? `${origin}/portal` : null;
    const managePath = customerUserId ? '/portal' : null;
    const accountPath = `/register?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/profile-setup?next=%2Fportal%3Fbook%3D1')}&customerFlow=1`;
    await sendMail({ to: email, subject: `Booking confirmed${job.reference ? ` (${job.reference})` : ''} — OTR Scooters`, body: customerConfirmationHtml(job, portalLink) }).catch((mailErr) => console.warn('[createBooking] customer confirmation email skipped:', mailErr.message));
    await sendSms({ to: phone, body: customerConfirmationSms(job, portalLink) }).catch((smsErr) => console.warn('[createBooking] customer confirmation SMS skipped:', smsErr.message));
    return Response.json({ reference: job.reference, managePath, accountPath, job_id: job.id, customer_profile_id: profile.id, linked: !!customerUserId });
  } catch (error) {
    console.error('[createBooking] FAILED:', JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    return Response.json({ error: error.message || "Sorry — we couldn't submit your booking just now. Please try again." }, { status: 500 });
  }
});