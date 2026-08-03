import {
  CUSTOMER_STATUSES,
  cleanEmail,
  cleanPhone,
  customerName,
  isManager,
  isStaff,
  logCustomerAudit,
  normalizePhone,
  resolveStaffContext,
} from '../../shared/customerCore.ts';

// All customer mutations. Every change writes an AuditEvent so the unified
// history timeline stays complete — callers must never write Customer directly.

async function findCustomerForJob(entities, job) {
  const candidateIds = [job.customer_account_id, job.customerId, job.customer_id, job.customer_profile_id].filter(Boolean);
  for (const id of candidateIds) {
    const byEntityId = await entities.Customer.get(id).catch(() => null);
    if (byEntityId) return byEntityId;
    const byStableId = await entities.Customer.filter({ customer_id: id }, '-updated_date', 1).catch(() => []);
    if (byStableId[0]) return byStableId[0];
  }

  const email = cleanEmail(job.customer_email || job.booking_submission?.customerEmail || job.intake?.customerEmail);
  if (email) {
    const byEmail = await entities.Customer.filter({ email }, '-updated_date', 1).catch(() => []);
    if (byEmail[0]) return byEmail[0];
  }

  const phone = normalizePhone(job.customer_phone_e164 || job.customer_phone || job.booking_submission?.customerPhoneE164 || job.booking_submission?.customerPhone || job.intake?.customerPhoneE164 || job.intake?.customerPhone);
  if (phone) {
    const byPhone = await entities.Customer.filter({ phone_e164: phone }, '-updated_date', 1).catch(() => []);
    if (byPhone[0]) return byPhone[0];
  }

  return null;
}

async function createCustomerForJob(entities, job) {
  const now = new Date().toISOString();
  const email = cleanEmail(job.customer_email || job.booking_submission?.customerEmail || job.intake?.customerEmail);
  const phoneDisplay = cleanPhone(job.customer_phone_display || job.customer_phone || job.booking_submission?.customerPhone || job.intake?.customerPhone);
  const phoneE164 = normalizePhone(job.customer_phone_e164 || phoneDisplay);
  const stableId = job.customer_id || `cust_${crypto.randomUUID()}`;
  const fullName = job.customer_name || job.booking_submission?.customerName || job.intake?.customerName || 'Unknown customer';

  return await entities.Customer.create({
    customer_id: stableId,
    full_name: fullName,
    name: fullName,
    email,
    phone: phoneE164 || phoneDisplay,
    phone_e164: phoneE164,
    phone_display: phoneDisplay || phoneE164,
    status: 'active',
    createdAt: now,
    last_activity_date: now,
  });
}

async function attachJobToCustomer(entities, job, customer) {
  if (!job?.id || !customer?.id) return;
  const stableId = customer.customer_id || customer.id;
  await entities.Job.update(job.id, {
    customer_id: stableId,
    customerId: stableId,
    customer_account_id: customer.id,
    customer_name: customerName(customer),
    customer_email: customer.email || '',
    customer_phone: customer.phone || customer.phone_e164 || '',
    customer_phone_e164: customer.phone_e164 || '',
    customer_phone_display: customer.phone_display || customer.phone || '',
  }).catch(() => null);
}

async function resolveCustomerForJob(entities, jobId, jobPayload) {
  const job = jobId ? await entities.Job.get(jobId) : jobPayload;
  if (!job) throw new Error('Job not found');
  let customer = await findCustomerForJob(entities, job);
  if (!customer) customer = await createCustomerForJob(entities, job);
  await attachJobToCustomer(entities, job, customer);
  return customer;
}

async function updateLinkedJobs(entities, customer, previousEmail, changes) {
  const stableId = customer.customer_id || customer.id;
  const jobPatch = {
    customer_name: changes.full_name,
    customer_email: changes.email || '',
    customer_phone: changes.phone || changes.phone_e164 || '',
    customer_phone_e164: changes.phone_e164 || '',
    customer_phone_display: changes.phone_display || changes.phone || '',
    customer_id: stableId,
    customerId: stableId,
    customer_account_id: customer.id,
  };

  const seen = new Set();
  const batches = [];
  batches.push(await entities.Job.filter({ customer_id: stableId }, '-updated_date', 500).catch(() => []));
  batches.push(await entities.Job.filter({ customer_account_id: customer.id }, '-updated_date', 500).catch(() => []));
  if (previousEmail) batches.push(await entities.Job.filter({ customer_email: previousEmail }, '-updated_date', 500).catch(() => []));

  const jobs = batches.flat().filter((job) => {
    if (!job?.id || seen.has(job.id)) return false;
    seen.add(job.id);
    return true;
  });

  if (jobs.length) {
    await entities.Job.bulkUpdate(jobs.map((job) => ({ id: job.id, ...jobPatch }))).catch(async () => {
      for (const job of jobs) await entities.Job.update(job.id, jobPatch).catch(() => null);
    });
  }
}

async function updateCustomer(entities, actor, customerId, changes) {
  const customer = await entities.Customer.get(customerId);
  if (!customer) throw new Error('Customer not found');

  const fullName = String(changes.full_name || '').trim();
  if (!fullName) throw new Error('Customer name is required');
  const email = cleanEmail(changes.email || customer.email);
  const phoneDisplay = cleanPhone(changes.phone_display || changes.phone || customer.phone_display || customer.phone);
  const phoneE164 = normalizePhone(changes.phone_e164 || phoneDisplay) || customer.phone_e164 || '';

  const updatedFields = {
    full_name: fullName,
    name: fullName,
    email,
    phone: phoneE164 || phoneDisplay,
    phone_e164: phoneE164,
    phone_display: phoneDisplay || phoneE164,
    status: changes.status || customer.status || 'active',
    tags: Array.isArray(changes.tags) ? changes.tags : customer.tags || [],
    last_activity_date: new Date().toISOString(),
  };

  if (!customer.customer_id) updatedFields.customer_id = customer.id;

  const updated = await entities.Customer.update(customer.id, updatedFields);
  await updateLinkedJobs(entities, { ...customer, ...updated, ...updatedFields }, customer.email, updatedFields);

  const parts = [];
  if (updatedFields.full_name !== customer.full_name) parts.push('name updated');
  if (updatedFields.email !== customer.email) parts.push('email updated');
  if (updatedFields.phone !== customer.phone) parts.push('phone updated');
  if (updatedFields.status !== customer.status) parts.push(`status → ${updatedFields.status}`);
  if (JSON.stringify(updatedFields.tags || []) !== JSON.stringify(customer.tags || [])) parts.push('tags updated');
  if (parts.length) await logCustomerAudit(entities, actor, updated, `${customerName(updated)}: ${parts.join(', ')}`);

  return updated;
}

// Bulk status / tag edits, applied with the service role so every change is
// audited here — the admin UI must never write to Customer directly.
async function bulkUpdateCustomers(entities, actor, ids, changes = {}) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean))];
  if (!uniqueIds.length) throw new Error('No customers selected');

  const status = String(changes.status || '').trim();
  if (status && !CUSTOMER_STATUSES.includes(status)) {
    throw new Error(`Invalid customer status. Expected one of: ${CUSTOMER_STATUSES.join(', ')}`);
  }
  const addTag = String(changes.add_tag || '').trim();
  const removeTag = String(changes.remove_tag || '').trim();
  if (!status && !addTag && !removeTag) throw new Error('No changes supplied');

  const now = new Date().toISOString();
  const updates = [];
  const audits = [];

  for (const id of uniqueIds) {
    const existing = await entities.Customer.get(id).catch(() => null);
    if (!existing) continue;
    const tags = Array.isArray(existing.tags) ? existing.tags : [];
    const patch = { last_activity_date: now };
    const parts = [];

    if (status && existing.status !== status) {
      patch.status = status;
      parts.push(`status → ${status}`);
    }
    let nextTags = tags;
    if (addTag && !nextTags.includes(addTag)) {
      nextTags = [...nextTags, addTag];
      parts.push(`tag added: ${addTag}`);
    }
    if (removeTag && nextTags.includes(removeTag)) {
      nextTags = nextTags.filter((tag) => tag !== removeTag);
      parts.push(`tag removed: ${removeTag}`);
    }
    if (nextTags !== tags) patch.tags = nextTags;
    if (!parts.length) continue;

    updates.push({ id, ...patch });
    audits.push({ customer: existing, summary: `${customerName(existing)}: ${parts.join(', ')}` });
  }

  if (!updates.length) return { updated: 0, requested: uniqueIds.length };

  await entities.Customer.bulkUpdate(updates);
  // bulkUpdate skips per-record side effects, so audit rows are written explicitly.
  for (const entry of audits) {
    await logCustomerAudit(entities, actor, entry.customer, entry.summary, { bulk: true });
  }
  return { updated: updates.length, requested: uniqueIds.length };
}

// Deleting a Customer alone is not durable: the scheduled "Sync Customers From
// Users" automation recreates a record for any non-staff user without one, and
// the customer list derives rows from User/CustomerProfile records. So deletion
// also flags the linked user as a non-customer and removes the backing profile.
async function detachCustomerSources(entities, customer) {
  const email = cleanEmail(customer.email);

  const users = [
    ...(customer.user_id ? [await entities.User.get(customer.user_id).catch(() => null)] : []),
    ...(email ? await entities.User.filter({ email }, '-updated_date', 5).catch(() => []) : []),
  ].filter((user) => user?.id && !isStaff(user));

  for (const user of [...new Map(users.map((user) => [user.id, user])).values()]) {
    await entities.User.update(user.id, { is_customer: false }).catch(() => null);
  }

  const profiles = [
    ...(customer.user_id ? await entities.CustomerProfile.filter({ auth_user_id: customer.user_id }, '-updated_date', 10).catch(() => []) : []),
    ...(email ? await entities.CustomerProfile.filter({ email }, '-updated_date', 10).catch(() => []) : []),
  ];
  for (const profile of [...new Map(profiles.map((p) => [p.id, p])).values()]) {
    await entities.CustomerProfile.delete(profile.id).catch(() => null);
  }
}

async function deleteCustomers(entities, ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean))];
  let deleted = 0;
  for (const id of uniqueIds) {
    const existing = await entities.Customer.get(id).catch(() => null);
    if (!existing) continue;
    await detachCustomerSources(entities, existing);
    await entities.Customer.delete(id);
    deleted += 1;
  }
  return { deleted, requested: uniqueIds.length };
}

Deno.serve(async (req) => {
  try {
    const ctx = await resolveStaffContext(req);
    if (ctx.error) return ctx.error;
    const { user, entities } = ctx;

    const payload = await req.json().catch(() => ({}));
    const action = payload.action;

    if (action === 'resolveForJob') return Response.json({ customer: await resolveCustomerForJob(entities, payload.job_id, payload.job) });
    if (action === 'update') return Response.json({ customer: await updateCustomer(entities, user, payload.customer_id, payload.changes || {}) });
    if (action === 'bulkUpdate') {
      if (!isManager(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json(await bulkUpdateCustomers(entities, user, payload.customer_ids, payload.changes || {}));
    }
    if (action === 'delete') {
      if (String(user.role || '').toLowerCase() !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json(await deleteCustomers(entities, payload.customer_ids));
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[customerWrite] failed:', error?.message, error?.stack);
    return Response.json({ error: error.message || 'Customer update failed' }, { status: 500 });
  }
});