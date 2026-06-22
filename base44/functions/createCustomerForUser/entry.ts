import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildCustomerId(user) {
  if (user.customer_id) return user.customer_id;
  return `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : '';
}

async function syncCustomerForUser(base44, user) {
  if (!user?.id) {
    return { created: false, skipped: true, reason: 'User is missing' };
  }
  const isStaffAccount = ['admin', 'employee', 'technician', 'staff'].includes(String(user.role || '').toLowerCase()) || user.is_customer === false || user.data?.is_customer === false;
  if (isStaffAccount) {
    return { created: false, skipped: true, reason: 'User is staff' };
  }

  const email = normalizeEmail(user.email);
  if (!email) {
    return { created: false, skipped: true, reason: 'User has no email' };
  }

  const relatedJobs = await base44.asServiceRole.entities.Job.filter({ customer_email: email }, '-created_date', 100);
  const relatedJobIds = [...new Set(relatedJobs.map((job) => job.job_id || job.id).filter(Boolean))].join(',');
  const phone = normalizePhone(user.phone) || normalizePhone(relatedJobs[0]?.customer_phone_e164) || normalizePhone(relatedJobs[0]?.customer_phone);

  async function claimRelatedJobs(customerId) {
    for (const job of relatedJobs) {
      const desiredJobId = job.job_id || job.id;
      const jobUpdates = {};
      if (job.job_id !== desiredJobId) jobUpdates.job_id = desiredJobId;
      if (job.customer_id !== customerId) jobUpdates.customer_id = customerId;
      if (job.customerId !== customerId) jobUpdates.customerId = customerId;
      if (job.customer_account_id !== user.id) jobUpdates.customer_account_id = user.id;
      if (job.claimed_by_customer !== true) jobUpdates.claimed_by_customer = true;
      if (Object.keys(jobUpdates).length > 0) {
        await base44.asServiceRole.entities.Job.update(job.id, jobUpdates);
      }
    }
  }

  const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ email });
  if (existingCustomers.length > 0) {
    const existingCustomer = existingCustomers[0];
    const customerId = existingCustomer.customer_id || user.customer_id || buildCustomerId(user);
    const updates = {};

    if (!existingCustomer.user_id) updates.user_id = user.id;
    if (!existingCustomer.customer_id) updates.customer_id = customerId;
    if (phone && existingCustomer.phone !== phone) updates.phone = phone;
    if (phone && existingCustomer.phone_e164 !== phone) updates.phone_e164 = phone;
    if (phone && existingCustomer.phone_display !== phone) updates.phone_display = phone;
    if (relatedJobIds && existingCustomer.job_id !== relatedJobIds) updates.job_id = relatedJobIds;

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Customer.update(existingCustomer.id, updates);
    }

    const userUpdates = {};
    if (!user.customer_id) userUpdates.customer_id = customerId;
    if (relatedJobIds && user.job_id !== relatedJobIds) userUpdates.job_id = relatedJobIds;
    if (Object.keys(userUpdates).length > 0) {
      await base44.asServiceRole.entities.User.update(user.id, userUpdates);
    }

    await claimRelatedJobs(customerId);

    return { created: false, linked: true, customer_id: customerId };
  }

  const customerId = buildCustomerId(user);
  const customer = await base44.asServiceRole.entities.Customer.create({
    customer_id: customerId,
    job_id: relatedJobIds,
    full_name: user.full_name || email,
    email,
    phone,
    phone_e164: phone,
    phone_display: phone,
    user_id: user.id,
    status: 'active',
    tags: ['customer'],
    last_activity_date: new Date().toISOString(),
  });

  const userUpdates = {};
  if (!user.customer_id) userUpdates.customer_id = customerId;
  if (relatedJobIds && user.job_id !== relatedJobIds) userUpdates.job_id = relatedJobIds;
  if (Object.keys(userUpdates).length > 0) {
    await base44.asServiceRole.entities.User.update(user.id, userUpdates);
  }

  await claimRelatedJobs(customerId);

  return { created: true, customer_id: customerId, customer_record_id: customer.id };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    if (payload?.data) {
      const result = await syncCustomerForUser(base44, payload.data);
      return Response.json(result);
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    const customerUsers = users.filter((user) => !['admin', 'employee', 'technician', 'staff'].includes(String(user.role || '').toLowerCase()) && user.is_customer !== false && user.data?.is_customer !== false);
    const results = [];

    for (const user of customerUsers) {
      results.push(await syncCustomerForUser(base44, user));
    }

    return Response.json({
      scanned: users.length,
      customer_users: customerUsers.length,
      created: results.filter((result) => result.created).length,
      linked: results.filter((result) => result.linked).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});