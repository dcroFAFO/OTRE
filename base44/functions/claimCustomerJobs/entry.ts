import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const cleanText = (value) => String(value || '').trim().toLowerCase();

function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : '';
}
function isStaffAccount(user) { return STAFF_ROLES.has(String(user.role || '').toLowerCase()) || user.is_customer === false || user.data?.is_customer === false; }
function addIdList(existing, nextId) { const ids = String(existing || '').split(',').map((id) => id.trim()).filter(Boolean); if (nextId && !ids.includes(nextId)) ids.push(nextId); return ids.join(','); }
function userPhoto(user) { return user.picture || user.avatar_url || user.photo_url || user.image || user.data?.picture || user.data?.avatar_url || ''; }
function userProvider(user) { return user.oauth_provider || user.auth_provider || user.provider || user.provider_name || user.identities?.[0]?.provider || user.data?.oauth_provider || ''; }
function scooterLabel(profileData, profile, jobs) { return profileData.scooter_make_model || profileData.default_scooter_make_model || profile?.scooter_make_model || profile?.default_scooter_make_model || jobs[0]?.asset_label || jobs[0]?.scooter_make_model || jobs[0]?.scooter_details || ''; }
function scooterMatches(a, b) { const aSerial = cleanText(a.serial_number); const bSerial = cleanText(b.serial_number); if (aSerial && bSerial && aSerial === bSerial) return true; return !!cleanText(a.model) && cleanText(a.make) === cleanText(b.make) && cleanText(a.model) === cleanText(b.model); }
function splitAssetLabel(label = '') { const parts = String(label || '').trim().split(/\s+/); return { make: parts[0] || '', model: parts.slice(1).join(' ') || '' }; }

async function ensureProfile(base44, user, email, jobs, profileData = {}) {
  const matches = await base44.asServiceRole.entities.CustomerProfile.filter({ email }, '-created_date', 10).catch(() => []);
  let profile = matches.find((p) => !p.auth_user_id || p.auth_user_id === user.id) || matches[0] || null;
  const now = new Date().toISOString();
  const phone = normalizePhone(profileData.phone_e164) || normalizePhone(user.phone) || normalizePhone(jobs[0]?.customer_phone_e164) || normalizePhone(jobs[0]?.customer_phone) || normalizePhone(profile?.phone_e164);
  const defaultScooter = scooterLabel(profileData, profile, jobs);
  const provider = profileData.oauth_provider || userProvider(user);
  const photo = profileData.display_photo || userPhoto(user);
  if (!profile) {
    profile = await base44.asServiceRole.entities.CustomerProfile.create({ display_name: profileData.display_name || user.full_name || jobs[0]?.customer_name || email, name: profileData.full_name || profileData.display_name || user.full_name || jobs[0]?.customer_name || email, full_name: profileData.full_name || user.full_name || '', email, phone_e164: phone, display_photo: photo, oauth_provider: provider, scooter_make: profileData.scooter_make || '', scooter_model: profileData.scooter_model || '', scooter_make_model: defaultScooter, default_scooter_make_model: defaultScooter, auth_user_id: user.id, email_verified: true, created_from_booking: jobs.length > 0, created_at: now, updated_at: now });
  } else {
    const updates = { updated_at: now, email_verified: true };
    if (!profile.auth_user_id) updates.auth_user_id = user.id;
    if (phone && profile.phone_e164 !== phone) updates.phone_e164 = phone;
    if (profileData.display_name) updates.display_name = profileData.display_name;
    if (profileData.full_name) updates.full_name = profileData.full_name;
    if (!profile.name && (profileData.full_name || profileData.display_name || user.full_name)) updates.name = profileData.full_name || profileData.display_name || user.full_name;
    if (photo) updates.display_photo = photo;
    if (provider) updates.oauth_provider = provider;
    if (profileData.scooter_make) updates.scooter_make = profileData.scooter_make;
    if (profileData.scooter_model) updates.scooter_model = profileData.scooter_model;
    if (defaultScooter) { updates.scooter_make_model = defaultScooter; updates.default_scooter_make_model = defaultScooter; }
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, updates);
    profile = { ...profile, ...updates };
  }
  return profile;
}

async function ensureCustomer(base44, user, profile, email, jobs, profileData = {}) {
  const existing = await base44.asServiceRole.entities.Customer.filter({ email }, '-created_date', 1).catch(() => []);
  const now = new Date().toISOString();
  const phone = profile.phone_e164 || normalizePhone(profileData.phone_e164) || normalizePhone(jobs[0]?.customer_phone_e164) || normalizePhone(jobs[0]?.customer_phone) || '';
  const data = { customer_id: profile.id, user_id: user.id, name: profile.name || profile.full_name || user.full_name || email, full_name: profile.full_name || profile.name || user.full_name || email, email, phone, phone_e164: phone, phone_display: phone, status: existing[0]?.status || 'active', tags: existing[0]?.tags || ['customer'], last_activity_date: now };
  if (existing[0]) return await base44.asServiceRole.entities.Customer.update(existing[0].id, data);
  return await base44.asServiceRole.entities.Customer.create({ ...data, createdAt: now });
}

async function resolveScooter(base44, customer, source = {}, jobId = '') {
  const stableId = customer.customer_id || customer.id;
  const fromLabel = splitAssetLabel(source.asset_label || source.scooter_make_model || source.scooter_details || '');
  const data = { make: source.scooter_make || source.scooterMake || source.make || source.booking_submission?.scooterMake || source.intake?.make || fromLabel.make, model: source.scooter_model || source.scooterModel || source.model || source.booking_submission?.scooterModel || source.intake?.model || fromLabel.model, serial_number: source.serial_number || source.intake?.serial_number || source.booking_submission?.serial_number || '', colour: source.colour || source.color || source.booking_submission?.colour || '', notes: source.notes || source.intake?.physical_condition || source.booking_submission?.urgencyOrSafetyNotes || '' };
  if (!data.make && !data.model && !data.serial_number) return null;
  const [byStable, byAccount] = await Promise.all([
    base44.asServiceRole.entities.Scooter.filter({ customer_id: stableId }, '-updated_date', 100).catch(() => []),
    base44.asServiceRole.entities.Scooter.filter({ customer_account_id: customer.id }, '-updated_date', 100).catch(() => []),
  ]);
  const existing = [...new Map([...byStable, ...byAccount].map((s) => [s.id, s])).values()].find((s) => scooterMatches(s, data));
  if (existing) return await base44.asServiceRole.entities.Scooter.update(existing.id, { customer_id: stableId, customer_account_id: customer.id, job_id: addIdList(existing.job_id, jobId) });
  return await base44.asServiceRole.entities.Scooter.create({ ...data, color: data.colour, customer_id: stableId, customer_account_id: customer.id, job_id: jobId || '' });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (isStaffAccount(user)) return Response.json({ linked: 0, skipped: 'staff account' });
    const email = normalizeEmail(user.email);
    if (!email) return Response.json({ error: 'Your account needs an email address to manage jobs.' }, { status: 400 });

    const [byUser, byEmail] = await Promise.all([
      base44.asServiceRole.entities.Job.filter({ customer_user_id: user.id }, '-created_date', 100),
      base44.asServiceRole.entities.Job.filter({ customer_email: email }, '-created_date', 100),
    ]);
    const jobs = [...new Map([...byUser, ...byEmail].map((job) => [job.id, job])).values()];
    const profile = await ensureProfile(base44, user, email, jobs, payload.profile || {});
    const customer = await ensureCustomer(base44, user, profile, email, jobs, payload.profile || {});
    const stableCustomerId = customer.customer_id || profile.id;

    await resolveScooter(base44, customer, payload.profile || {}, '');
    let jobIdList = user.job_id || customer.job_id || '';
    let linked = 0;
    for (const job of jobs) {
      const stableJobId = job.job_id || job.id;
      jobIdList = addIdList(jobIdList, stableJobId);
      const scooter = await resolveScooter(base44, customer, job, job.id);
      const assetLabel = scooter ? [scooter.make, scooter.model].filter(Boolean).join(' ') : (job.asset_label || job.scooter_make_model || '');
      await base44.asServiceRole.entities.Job.update(job.id, { job_id: stableJobId, customer_profile_id: profile.id, customer_user_id: user.id, customer_id: stableCustomerId, customerId: stableCustomerId, customer_account_id: customer.id, asset_id: scooter?.id || job.asset_id || '', asset_label: assetLabel, scooter_make_model: assetLabel || job.scooter_make_model || '', claimed_by_customer: true, updatedAt: new Date().toISOString() });
      linked += 1;
    }
    await base44.asServiceRole.entities.Customer.update(customer.id, { job_id: jobIdList, last_activity_date: new Date().toISOString() });
    const userUpdates = { is_customer: true, customer_id: stableCustomerId, customer_account_id: customer.id };
    if (jobIdList) userUpdates.job_id = jobIdList;
    await base44.asServiceRole.entities.User.update(user.id, userUpdates);

    // Trigger welcome email to customer and notification to staff
    const origin = req.headers.get('origin') || '';
    await base44.functions.invoke('sendNotification', { event_type: 'user_welcome', user_id: user.id, origin }).catch((e) => console.warn('[claimCustomerJobs] welcome notification failed:', e.message));

    return Response.json({ linked, customer_profile_id: profile.id, customer_account_id: customer.id });
  } catch (error) {
    console.error('[claimCustomerJobs] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});