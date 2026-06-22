import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : '';
}

function isStaffAccount(user) {
  return STAFF_ROLES.has(String(user.role || '').toLowerCase()) || user.is_customer === false || user.data?.is_customer === false;
}

function addIdList(existing, nextId) {
  const ids = String(existing || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (nextId && !ids.includes(nextId)) ids.push(nextId);
  return ids.join(',');
}

function userPhoto(user) {
  return user.picture || user.avatar_url || user.photo_url || user.image || user.data?.picture || user.data?.avatar_url || '';
}

function userProvider(user) {
  return user.oauth_provider || user.auth_provider || user.provider || user.provider_name || user.identities?.[0]?.provider || user.data?.oauth_provider || '';
}

function scooterLabel(profileData, profile, jobs) {
  return profileData.scooter_make_model || profileData.default_scooter_make_model || profile?.scooter_make_model || profile?.default_scooter_make_model || jobs[0]?.asset_label || jobs[0]?.scooter_make_model || jobs[0]?.scooter_details || '';
}

async function ensureProfile(base44, user, email, jobs, profileData = {}) {
  const matches = await base44.asServiceRole.entities.CustomerProfile.filter({ email }, '-created_date', 10).catch(() => []);
  let profile = matches.find((p) => !p.auth_user_id || p.auth_user_id === user.id) || matches[0] || null;
  const now = new Date().toISOString();
  const phone = normalizePhone(profileData.phone_e164) || normalizePhone(user.phone) || normalizePhone(jobs[0]?.customer_phone_e164) || normalizePhone(jobs[0]?.customer_phone) || normalizePhone(profile?.phone_e164);
  const defaultScooter = scooterLabel(profileData, profile, jobs);
  const provider = profileData.oauth_provider || userProvider(user);
  const photo = profileData.display_photo || userPhoto(user);

  if (!profile) {
    profile = await base44.asServiceRole.entities.CustomerProfile.create({
      display_name: profileData.display_name || user.full_name || jobs[0]?.customer_name || email,
      name: profileData.full_name || profileData.display_name || user.full_name || jobs[0]?.customer_name || email,
      full_name: profileData.full_name || user.full_name || '',
      email,
      phone_e164: phone,
      display_photo: photo,
      oauth_provider: provider,
      scooter_make: profileData.scooter_make || '',
      scooter_model: profileData.scooter_model || '',
      scooter_make_model: defaultScooter,
      default_scooter_make_model: defaultScooter,
      auth_user_id: user.id,
      email_verified: true,
      created_from_booking: jobs.length > 0,
      created_at: now,
      updated_at: now,
    });
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
    if (defaultScooter) {
      updates.scooter_make_model = defaultScooter;
      updates.default_scooter_make_model = defaultScooter;
    }
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, updates);
    profile = { ...profile, ...updates };
  }
  return profile;
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

    let jobIdList = user.job_id || '';
    let linked = 0;
    for (const job of jobs) {
      const stableJobId = job.job_id || job.id;
      jobIdList = addIdList(jobIdList, stableJobId);
      await base44.asServiceRole.entities.Job.update(job.id, {
        job_id: stableJobId,
        customer_profile_id: job.customer_profile_id || profile.id,
        customer_user_id: user.id,
        customer_id: job.customer_id || profile.id,
        customerId: job.customerId || profile.id,
        customer_account_id: user.id,
        claimed_by_customer: true,
        updatedAt: new Date().toISOString(),
      });
      linked += 1;
    }

    const legacyCustomers = await base44.asServiceRole.entities.Customer.filter({ email }, '-created_date', 1).catch(() => []);
    if (legacyCustomers[0]) {
      await base44.asServiceRole.entities.Customer.update(legacyCustomers[0].id, {
        customer_id: profile.id,
        user_id: user.id,
        job_id: jobIdList || legacyCustomers[0].job_id || '',
        phone: profile.phone_e164 || legacyCustomers[0].phone || '',
        phone_e164: profile.phone_e164 || legacyCustomers[0].phone_e164 || '',
        phone_display: profile.phone_e164 || legacyCustomers[0].phone_display || '',
        last_activity_date: new Date().toISOString(),
      });
    }

    const userUpdates = { is_customer: true, customer_id: profile.id };
    if (jobIdList) userUpdates.job_id = jobIdList;
    await base44.asServiceRole.entities.User.update(user.id, userUpdates);
    return Response.json({ linked, customer_profile_id: profile.id });
  } catch (error) {
    console.error('[claimCustomerJobs] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});