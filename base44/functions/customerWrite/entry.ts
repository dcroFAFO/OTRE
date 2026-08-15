import {
  CUSTOMER_STATUSES,
  cleanEmail,
  cleanPhone,
  customerName,
  isManager,
  logCustomerAudit,
  normalizePhone,
  resolveStaffContext,
} from '../../shared/customerCore.ts';

// All customer mutations. Every change writes an AuditEvent so the unified
// history timeline stays complete — callers must never write Customer directly.

async function findCustomerForJob(entities, job) {
  if (!job?.customer_account_id) return null;
  return await entities.Customer.get(job.customer_account_id).catch(() => null);
}

async function createCustomerForJob(entities, job) {
  const now = new Date().toISOString();
  const email = cleanEmail(job.customer_email || job.booking_submission?.customerEmail || job.intake?.customerEmail);
  const phoneDisplay = cleanPhone(job.customer_phone_display || job.customer_phone || job.booking_submission?.customerPhone || job.intake?.customerPhone);
  const phoneE164 = normalizePhone(job.customer_phone_e164 || phoneDisplay);
  const stableId = `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
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
    identity_version: 2,
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

  const jobs = await entities.Job.filter({ customer_account_id: customer.id }, '-updated_date', 500).catch(() => []);

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

  const updatedFields: any = {
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
async function bulkUpdateCustomers(entities, actor, ids, changes: any = {}) {
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
    const patch: any = { last_activity_date: now };
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

async function detachCustomerSources(entities, customer) {
  const profiles = await entities.CustomerProfile.filter({ customer_account_id: customer.id }, '-updated_date', 100).catch(() => []);
  for (const profile of profiles) await entities.CustomerProfile.delete(profile.id).catch(() => null);
  const links = await entities.CustomerIdentityLink.filter({ customer_account_id: customer.id }, '-linked_at', 10).catch(() => []);
  const now = new Date().toISOString();
  for (const link of links.filter((record) => record.status === 'active')) await entities.CustomerIdentityLink.update(link.id, { status: 'revoked', revoked_at: now }).catch(() => null);
}

async function deleteCustomers(entities, ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean))];
  let deleted = 0;
  for (const id of uniqueIds) {
    const existing = await entities.Customer.get(id).catch(() => null);
    if (!existing) continue;
    const linkedJobs = await entities.Job.filter({ customer_account_id: existing.id }, '-created_date', 1).catch(() => []);
    if (linkedJobs.length || existing.user_id) throw new Error('Linked customer accounts cannot be deleted; set status to closed instead.');
    await detachCustomerSources(entities, existing);
    await entities.Customer.delete(id);
    deleted += 1;
  }
  return { deleted, requested: uniqueIds.length };
}

async function addCustomerNote(entities, actor, customerId, rawBody) {
  const body = String(rawBody || '').trim();
  if (!customerId) throw new Error('customer_id is required');
  if (!body) throw new Error('Note text is required');
  if (body.length > 5000) throw new Error('Note text is too long');
  const customer = await entities.Customer.get(customerId).catch(() => null);
  if (!customer) throw new Error('Customer not found');
  const now = new Date().toISOString();
  const note = await entities.CustomerNote.create({
    customer_id: customer.id,
    body,
    author_id: actor.id,
    author_name: actor.full_name || 'Administrator',
  });
  await entities.Customer.update(customer.id, { last_activity_date: now });
  await logCustomerAudit(
    entities,
    actor,
    customer,
    `${customerName(customer)}: internal note added`,
    { customer_id: customer.id },
  );
  return {
    id: note.id,
    customer_id: note.customer_id,
    body: note.body,
    author_id: note.author_id,
    author_name: note.author_name,
    created_date: note.created_date || now,
  };
}

async function updateCustomerReferral(entities, actor, customerId, changes) {
  const customer = await entities.Customer.get(customerId).catch(() => null);
  if (!customer) throw new Error('Customer not found');
  const status = String(changes.referral_status || 'none').trim();
  if (!['none', 'pending', 'completed'].includes(status)) throw new Error('Invalid referral status');
  const referredBy = String(changes.referred_by_customer_id || '').trim().slice(0, 160);
  if (referredBy && [customer.id, customer.customer_id].includes(referredBy)) throw new Error('A customer cannot refer themselves');
  if (referredBy) {
    const direct = await entities.Customer.get(referredBy).catch(() => null);
    const matches = direct ? [direct] : await entities.Customer.filter({ customer_id: referredBy }, '-updated_date', 2).catch(() => []);
    if (matches.length !== 1) throw new Error('Referring customer was not found');
  }
  const patch = {
    referral_code: String(changes.referral_code || '').trim().slice(0, 80),
    referred_by_customer_id: referredBy,
    referral_status: status,
    referral_eligible: changes.referral_eligible === true,
    referral_notes: String(changes.referral_notes || '').trim().slice(0, 2000),
    last_activity_date: new Date().toISOString(),
  };
  const updated = await entities.Customer.update(customer.id, patch);
  await logCustomerAudit(entities, actor, { ...customer, ...updated }, `${customerName(customer)}: referral details updated`);
  return { id: customer.id, ...patch };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const ctx = await resolveStaffContext(req);
    if (ctx.error) return ctx.error;
    const { user, entities } = ctx;

    const payload = await req.json().catch(() => ({}));
    const action = payload.action;

    if (action === 'resolveForJob') return Response.json({ customer: await resolveCustomerForJob(entities, payload.job_id, payload.job) });
    if (action === 'update') return Response.json({ customer: await updateCustomer(entities, user, payload.customer_id, payload.changes || {}) });
    if (action === 'addNote') return Response.json({ note: await addCustomerNote(entities, user, payload.customer_id, payload.body) });
    if (action === 'updateReferral') return Response.json({ customer: await updateCustomerReferral(entities, user, payload.customer_id, payload.changes || {}) });
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
    console.error('[customerWrite]', JSON.stringify({ code: 'customer_write_failed', message: String(error?.message || error).slice(0, 300) }));
    return Response.json({ error: error.message || 'Customer update failed' }, { status: 500 });
  }
});
