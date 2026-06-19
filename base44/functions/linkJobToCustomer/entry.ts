import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CHILD_ENTITIES = new Set(['Quote', 'Invoice', 'Attachment', 'JobNote', 'CustomerNote']);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parseJobIds(value) {
  return String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function addJobId(value, jobId) {
  const ids = parseJobIds(value);
  return ids.includes(jobId) ? ids.join(',') : [...ids, jobId].join(',');
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
  throw new Error('Unable to generate a unique customer_id');
}

async function findUserByEmail(base44, email) {
  if (!email) return null;
  const users = await base44.asServiceRole.entities.User.filter({ email }, '', 1);
  return users[0] || null;
}

async function findCustomerByEmail(base44, email) {
  if (!email) return null;
  const customers = await base44.asServiceRole.entities.Customer.filter({ email }, '', 1);
  return customers[0] || null;
}

async function jobsForEmail(base44, email) {
  if (!email) return [];
  return base44.asServiceRole.entities.Job.filter({ customer_email: email }, '-created_date', 100);
}

async function recordFromPayload(base44, payload) {
  const entityName = payload?.event?.entity_name;
  const recordId = payload?.event?.entity_id;
  if (!entityName || !recordId) return null;
  if (!payload.payload_too_large && payload.data) return payload.data;
  const api = base44.asServiceRole.entities[entityName];
  const records = await api.filter({ id: recordId }, '', 1);
  return records[0] || null;
}

async function syncUserAndCustomer(base44, options) {
  const email = normalizeEmail(options.email);
  const matchedUser = options.user || await findUserByEmail(base44, email);
  const matchedCustomer = options.customer || await findCustomerByEmail(base44, email);
  const existingJobs = await jobsForEmail(base44, email);
  const jobIds = existingJobs.map((job) => job.job_id || job.id);
  if (options.jobId && !jobIds.includes(options.jobId)) jobIds.push(options.jobId);

  if (matchedUser) {
    const nextJobId = jobIds.reduce((current, id) => addJobId(current, id), matchedUser.job_id || '');
    await base44.asServiceRole.entities.User.update(matchedUser.id, {
      customer_id: options.customerId,
      job_id: nextJobId,
    });
  }

  if (matchedCustomer) {
    const nextJobId = jobIds.reduce((current, id) => addJobId(current, id), matchedCustomer.job_id || '');
    await base44.asServiceRole.entities.Customer.update(matchedCustomer.id, {
      customer_id: options.customerId,
      job_id: nextJobId,
      user_id: matchedUser?.id || matchedCustomer.user_id,
    });
  }

  for (const job of existingJobs) {
    const desiredJobId = job.job_id || job.id;
    const updates = {};
    if (job.customer_id !== options.customerId) updates.customer_id = options.customerId;
    if (job.job_id !== desiredJobId) updates.job_id = desiredJobId;
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Job.update(job.id, updates);
    }
  }
}

async function linkJob(base44, job) {
  const email = normalizeEmail(job.customer_email);
  if (!email) return { skipped: 'job has no customer_email', job_id: job.id };

  const user = await findUserByEmail(base44, email);
  const customer = await findCustomerByEmail(base44, email);
  const customerId = job.customer_id || user?.customer_id || customer?.customer_id || await getUniqueCustomerId(base44);

  const jobId = job.job_id || job.id;
  await syncUserAndCustomer(base44, { email, customerId, jobId, user, customer });

  const updates = {};
  if (job.customer_id !== customerId) updates.customer_id = customerId;
  if (job.job_id !== jobId) updates.job_id = jobId;
  if (Object.keys(updates).length > 0) {
    await base44.asServiceRole.entities.Job.update(job.id, updates);
  }

  return { linked: true, entity: 'Job', job_id: jobId, customer_id: customerId, user_id: user?.id || null, customer_record_id: customer?.id || null };
}

async function linkUser(base44, user) {
  if (user.role && user.role !== 'customer') return { skipped: 'user is not a customer', user_id: user.id };

  const email = normalizeEmail(user.email);
  if (!email) return { skipped: 'user has no email', user_id: user.id };

  const customer = await findCustomerByEmail(base44, email);
  const customerId = user.customer_id || customer?.customer_id || await getUniqueCustomerId(base44);
  await syncUserAndCustomer(base44, { email, customerId, user, customer });

  return { linked: true, entity: 'User', user_id: user.id, customer_id: customerId };
}

async function linkCustomer(base44, customer) {
  const email = normalizeEmail(customer.email);
  if (!email) return { skipped: 'customer has no email', customer_record_id: customer.id };

  const user = await findUserByEmail(base44, email);
  const customerId = customer.customer_id || user?.customer_id || await getUniqueCustomerId(base44);
  await syncUserAndCustomer(base44, { email, customerId, user, customer });

  return { linked: true, entity: 'Customer', customer_record_id: customer.id, customer_id: customerId, user_id: user?.id || null };
}

async function linkChildRecord(base44, entityName, record) {
  if (!record.job_id) {
    return record.customer_id
      ? { linked: true, entity: entityName, customer_id: record.customer_id }
      : { skipped: entityName + ' has no job_id', record_id: record.id };
  }

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: record.job_id }, '', 1);
  const job = jobs[0];
  if (!job) return { skipped: 'matching job not found', entity: entityName, record_id: record.id, job_id: record.job_id };

  const linkedJob = await linkJob(base44, job);
  const customerId = linkedJob.customer_id;

  if (customerId && record.customer_id !== customerId) {
    const api = base44.asServiceRole.entities[entityName];
    await api.update(record.id, { customer_id: customerId });
  }

  return { linked: true, entity: entityName, record_id: record.id, job_id: record.job_id, customer_id: customerId };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    if (payload?.event?.type !== 'create') {
      return Response.json({ skipped: 'not a create event' });
    }

    const entityName = payload.event.entity_name;
    const record = await recordFromPayload(base44, payload);

    if (!record?.id) {
      return Response.json({ skipped: 'record not found in payload', entity: entityName });
    }

    if (entityName === 'Job') return Response.json(await linkJob(base44, record));
    if (entityName === 'User') return Response.json(await linkUser(base44, record));
    if (entityName === 'Customer') return Response.json(await linkCustomer(base44, record));
    if (CHILD_ENTITIES.has(entityName)) return Response.json(await linkChildRecord(base44, entityName, record));

    return Response.json({ skipped: 'unsupported entity', entity: entityName });
  } catch (error) {
    console.error('[linkJobToCustomer] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});