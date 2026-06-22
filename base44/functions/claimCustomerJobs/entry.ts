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

async function ensureProfile(base44, user, email, jobs) {
  const matches = await base44.asServiceRole.entities.CustomerProfile.filter({ email }, '-created_date', 10).catch(() => []);
  let profile = matches.find((p) => !p.auth_user_id || p.auth_user_id === user.id) || matches[0] || null;
  const now = new Date().toISOString();
  const phone = normalizePhone(user.phone) || normalizePhone(jobs[0]?.customer_phone_e164) || normalizePhone(jobs[0]?.customer_phone) || normalizePhone(profile?.phone_e164);

  if (!profile) {
    profile = await base44.asServiceRole.entities.CustomerProfile.create({
      name: user.full_name || jobs[0]?.customer_name || email,
      email,
      phone_e164: phone,
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
    if (!profile.name && user.full_name) updates.name = user.full_name;
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, updates);
    profile = { ...profile, ...updates };
  }
  return profile;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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
    const profile = await ensureProfile(base44, user, email, jobs);

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