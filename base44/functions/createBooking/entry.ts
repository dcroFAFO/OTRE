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
    serial_number: form.serial_number || form.serialNumber || '',
    colour: form.colour || form.color || '',
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
    profile = await base44.asServiceRole.entities.CustomerProfile.create({ name, display_name: name, full_name: name, email, phone_e164: phone, auth_user_id: authUserId || undefined, email_verified: !!authUserId, created_from_booking: true, created_at: now, updated_at: now });
  } else {
    const updates = { updated_at: now };
    if (!profile.name && name) updates.name = name;
    if (!profile.display_name && name) updates.display_name = name;
    if (!profile.full_name && name) updates.full_name = name;
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
    if (existing) return await base44.asServiceRole.entities.Customer.update(existing.id, data);
    return await base44.asServiceRole.entities.Customer.create({ ...data, createdAt: now });
  } catch (error) { console.warn('[createBooking] legacy customer sync skipped:', error.message); return null; }
}

function cleanText(value) { return String(value || '').trim().toLowerCase(); }
function addIdList(existing, nextId) {
  const ids = String(existing || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (nextId && !ids.includes(nextId)) ids.push(nextId);
  return ids.join(',');
}
function scooterMatches(a, b) {
  const aSerial = cleanText(a.serial_number);
  const bSerial = cleanText(b.serial_number);
  if (aSerial && bSerial && aSerial === bSerial) return true;
  return !!cleanText(a.model) && cleanText(a.make) === cleanText(b.make) && cleanText(a.model) === cleanText(b.model);
}
async function resolveBookingScooter(base44, customer, booking) {
  if (!customer) return null;
  const stableId = customer.customer_id || customer.id;
  const data = { make: booking.scooterMake || booking.scooterBrand || '', model: booking.scooterModel || '', serial_number: booking.serial_number || '', colour: booking.colour || booking.color || '', color: booking.color || booking.colour || '', notes: booking.urgencyOrSafetyNotes || booking.issueOrService || '' };
  if (!data.make && !data.model && !data.serial_number) return null;
  const [byStable, byAccount] = await Promise.all([
    base44.asServiceRole.entities.Scooter.filter({ customer_id: stableId }, '-updated_date', 100).catch(() => []),
    base44.asServiceRole.entities.Scooter.filter({ customer_account_id: customer.id }, '-updated_date', 100).catch(() => []),
  ]);
  const existing = [...new Map([...byStable, ...byAccount].map((s) => [s.id, s])).values()].find((s) => scooterMatches(s, data));
  if (existing) return await base44.asServiceRole.entities.Scooter.update(existing.id, { customer_id: stableId, customer_account_id: customer.id });
  return await base44.asServiceRole.entities.Scooter.create({ ...data, customer_id: stableId, customer_account_id: customer.id });
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
    const customerRecord = await syncLegacyCustomer(base44, { profile, name: form.customer_name, email, phone, user, now });
    const stableCustomerId = customerRecord?.customer_id || profile.id;

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
      scooter_make_model: submittedBooking.assetLabel || profile.scooter_make_model || profile.default_scooter_make_model || '',
      default_scooter_make_model: submittedBooking.assetLabel || profile.default_scooter_make_model || profile.scooter_make_model || '',
      updated_at: now,
    }).catch((profileErr) => console.warn('[createBooking] profile details sync skipped:', profileErr.message));
    const scooter = await resolveBookingScooter(base44, customerRecord, submittedBooking);
    const resolvedAssetLabel = scooter ? [scooter.make, scooter.model].filter(Boolean).join(' ') : (form.asset_label || submittedBooking.assetLabel);
    const initialIntake = { customerName: submittedBooking.customerName, customerEmail: submittedBooking.customerEmail, customerPhone: submittedBooking.customerPhone, customerPhoneE164: submittedBooking.customerPhoneE164, scooterMake: submittedBooking.scooterMake, scooterModel: submittedBooking.scooterModel, make: submittedBooking.scooterMake, model: submittedBooking.scooterModel, serial_number: submittedBooking.serial_number || '', issueOrService: submittedBooking.issueOrService, initial_issue_notes: [submittedBooking.issueOrService, submittedBooking.urgencyOrSafetyNotes].filter(Boolean).join('\n'), service_type: submittedBooking.serviceType, date: submittedBooking.preferredDate, isRideable: submittedBooking.isRideable, booking_files: submittedBooking.files };
    const job = await base44.asServiceRole.entities.Job.create({ reference, tracking_token: rawToken, guest_access_token: rawToken, customer_profile_id: profile.id, customer_user_id: customerUserId, customerId: stableCustomerId, customer_id: stableCustomerId, customer_account_id: customerRecord?.id || '', claimed_by_customer: !!customerUserId, customer_name: form.customer_name, customer_email: email, customer_phone: phone, customer_phone_e164: phone, customer_phone_display: phone, asset_id: scooter?.id || '', asset_label: resolvedAssetLabel, scooter_make_model: resolvedAssetLabel, scooterDetails: resolvedAssetLabel, scooter_details: resolvedAssetLabel, issueDescription: form.issue_description, issue_description: form.issue_description, issue_summary: form.issue_description, rideable_status: submittedBooking.isRideable ? 'Rideable' : 'Not rideable', job_status: INTAKE_STATUS, source: 'public_booking', job_type: JOB_TYPE, service_type: submittedBooking.serviceType, priority: 'medium', status: INTAKE_STATUS, scheduled_date: form.asap ? null : (form.preferred_date || null), preferred_time_window: form.asap ? 'ASAP' : form.preferred_time_window, rideable: submittedBooking.isRideable, intake: initialIntake, booking_submission: submittedBooking, business_slug: SLUG, createdAt: now, created_at: now, updatedAt: now });

    if (scooter?.id) await base44.asServiceRole.entities.Scooter.update(scooter.id, { job_id: addIdList(scooter.job_id, job.id), last_service_date: job.scheduled_date || scooter.last_service_date || '' }).catch((assetErr) => console.warn('[createBooking] scooter job link skipped:', assetErr.message));
    if (customerRecord?.id) await base44.asServiceRole.entities.Customer.update(customerRecord.id, { job_id: addIdList(customerRecord.job_id, job.id), last_activity_date: now }).catch((customerErr) => console.warn('[createBooking] customer job link skipped:', customerErr.message));
    if (submittedBooking.files.length > 0) await Promise.all(submittedBooking.files.map((fileUrl, index) => base44.asServiceRole.entities.Attachment.create({ job_id: job.id, customer_id: stableCustomerId, file_url: fileUrl, file_name: `booking_upload_${index + 1}`, kind: 'photo', visibility: 'customer', uploaded_by_name: submittedBooking.customerName })));
    if (rawToken) { const tokenHash = await sha256(rawToken); await base44.asServiceRole.entities.PublicJobAccess.create({ jobId: job.id, job_id: job.id, tokenHash, token_hash: tokenHash, permissions: DEFAULT_PERMISSIONS, createdAt: now }); }
    await base44.asServiceRole.entities.AuditEvent.create({ event_type: 'booking_created', job_id: job.id, customer_id: customerRecord?.id || stableCustomerId, actor_name: form.customer_name, actor_role: customerUserId ? 'customer_account' : 'guest_customer', summary: `Booking request received from ${form.customer_name}`, visibility: 'system', metadata: { customer_id: customerRecord?.id || '', stable_customer_id: stableCustomerId, scooter_id: scooter?.id || '' } }).catch((auditErr) => console.warn('[createBooking] audit log skipped:', auditErr.message));

    // Send booking confirmation notifications directly (customer email + SMS, staff email + SMS).
    // The entity automation may not reliably deliver the payload, so we invoke sendNotification directly.
    const notifOrigin = originFrom(req);
    await base44.functions.invoke('sendNotification', { event_type: 'booking_request', job_id: job.id, origin: notifOrigin }).catch((notifErr) => console.warn('[createBooking] notification dispatch skipped:', notifErr?.message || notifErr));

    const managePath = customerUserId ? '/portal' : null;
    const accountPath = `/register?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/profile-setup?next=%2Fportal%3Fbook%3D1')}&customerFlow=1`;
    return Response.json({ reference: job.reference, managePath, accountPath, job_id: job.id, customer_profile_id: profile.id, customer_account_id: customerRecord?.id || '', asset_id: scooter?.id || '', linked: !!customerUserId });
  } catch (error) {
    console.error('[createBooking] FAILED:', JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    return Response.json({ error: error.message || "Sorry — we couldn't submit your booking just now. Please try again." }, { status: 500 });
  }
});