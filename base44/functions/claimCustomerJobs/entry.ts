import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function addIdList(existing, nextId) {
  const ids = String(existing || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (nextId && !ids.includes(nextId)) ids.push(nextId);
  return ids.join(',');
}

function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : '';
}

function generateCustomerId() {
  return `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function getUniqueCustomerId(base44) {
  for (let i = 0; i < 25; i += 1) {
    const customerId = generateCustomerId();
    const users = await base44.asServiceRole.entities.User.filter({ customer_id: customerId }, '', 1);
    const customers = await base44.asServiceRole.entities.Customer.filter({ customer_id: customerId }, '', 1);
    if (users.length === 0 && customers.length === 0) return customerId;
  }
  throw new Error('Unable to generate customer account id');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = normalizeEmail(user.email);
    if (!email) {
      return Response.json({ error: 'Your account needs an email address to manage jobs.' }, { status: 400 });
    }

    const jobs = await base44.asServiceRole.entities.Job.filter({ customer_email: email }, '-created_date', 100);
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ email }, '-created_date', 1);
    const existingCustomer = existingCustomers[0] || null;
    const phone = normalizePhone(user.phone) || normalizePhone(jobs[0]?.customer_phone_e164) || normalizePhone(jobs[0]?.customer_phone) || normalizePhone(existingCustomer?.phone_e164) || normalizePhone(existingCustomer?.phone);
    const customerId = user.customer_id || existingCustomer?.customer_id || await getUniqueCustomerId(base44);

    let jobIdList = existingCustomer?.job_id || user.job_id || '';
    for (const job of jobs) {
      const stableJobId = job.job_id || job.id;
      jobIdList = addIdList(jobIdList, stableJobId);
      await base44.asServiceRole.entities.Job.update(job.id, {
        job_id: stableJobId,
        customer_id: customerId,
        customerId: customerId,
        customer_account_id: user.id,
        claimed_by_customer: true,
        updatedAt: new Date().toISOString(),
      });
    }

    if (existingCustomer) {
      await base44.asServiceRole.entities.Customer.update(existingCustomer.id, {
        customer_id: customerId,
        user_id: user.id,
        job_id: jobIdList,
        phone: phone || existingCustomer.phone || '',
        phone_e164: phone || existingCustomer.phone_e164 || '',
        phone_display: phone || existingCustomer.phone_display || '',
        status: existingCustomer.status || 'active',
        last_activity_date: new Date().toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.Customer.create({
        customer_id: customerId,
        user_id: user.id,
        job_id: jobIdList,
        full_name: user.full_name || email,
        name: user.full_name || email,
        email,
        phone,
        phone_e164: phone,
        phone_display: phone,
        status: 'active',
        tags: ['customer'],
        createdAt: new Date().toISOString(),
        last_activity_date: new Date().toISOString(),
      });
    }

    const userUpdates = { is_customer: true };
    if (user.customer_id !== customerId) userUpdates.customer_id = customerId;
    if (jobIdList && user.job_id !== jobIdList) userUpdates.job_id = jobIdList;
    await base44.asServiceRole.entities.User.update(user.id, userUpdates);

    return Response.json({ linked: jobs.length, customer_id: customerId });
  } catch (error) {
    console.error('[claimCustomerJobs] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});