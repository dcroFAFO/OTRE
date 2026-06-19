import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parseJobIds(value) {
  return String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function generateCustomerId() {
  return `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function getUniqueCustomerId(base44) {
  for (let i = 0; i < 25; i += 1) {
    const customerId = generateCustomerId();
    const existing = await base44.asServiceRole.entities.User.filter({ customer_id: customerId }, '', 1);
    if (existing.length === 0) return customerId;
  }
  throw new Error('Unable to generate a unique customer_id');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    if (payload?.event?.type !== 'create') {
      return Response.json({ skipped: 'not a create event' });
    }

    const jobId = payload.event.entity_id;
    const job = payload.payload_too_large
      ? (await base44.asServiceRole.entities.Job.filter({ id: jobId }, '', 1))[0]
      : payload.data;

    if (!job?.id || !jobId) {
      return Response.json({ skipped: 'job not found in payload' });
    }

    const customerEmail = normalizeEmail(job.customer_email);
    if (!customerEmail) {
      return Response.json({ skipped: 'job has no customer_email', job_id: jobId });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail }, '', 1);
    const customer = users[0];
    if (!customer) {
      return Response.json({ skipped: 'no matching user for customer_email', customer_email: customerEmail, job_id: jobId });
    }

    const customerId = customer.customer_id || await getUniqueCustomerId(base44);
    const jobIds = parseJobIds(customer.job_id);
    const updatedJobIds = jobIds.includes(jobId) ? jobIds : [...jobIds, jobId];

    await base44.asServiceRole.entities.User.update(customer.id, {
      customer_id: customerId,
      job_id: updatedJobIds.join(',')
    });

    if (job.customer_id !== customerId) {
      await base44.asServiceRole.entities.Job.update(jobId, { customer_id: customerId });
    }

    return Response.json({ linked: true, job_id: jobId, customer_id: customerId, user_id: customer.id });
  } catch (error) {
    console.error('[linkJobToCustomer] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});