import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);

function isStaff(user) {
  return STAFF_ROLES.has(String(user?.role || user?.data?.role || '').toLowerCase());
}

function userField(user, key) {
  return user?.[key] ?? user?.data?.[key] ?? '';
}

function isCustomerUserRecord(user) {
  if (!user?.id || isStaff(user) || user?.is_service) return false;
  const explicitCustomer = userField(user, 'is_customer') === true;
  const hasCustomerLink = !!(userField(user, 'customer_id') || userField(user, 'job_id'));
  return explicitCustomer || hasCustomerLink;
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanPhone(value) {
  return String(value || '').trim();
}

function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : '';
}

function customerName(customer) {
  return customer?.full_name || customer?.name || customer?.display_name || 'Customer';
}

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

async function linkJobToCustomer(entities, job, customer) {
  if (!job?.id || !customer?.id) return;
  const stableId = customer.customer_id || customer.id;
  await entities.Job.update(job.id, {
    customer_id: stableId,
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
  await linkJobToCustomer(entities, job, customer);
  return customer;
}

async function logCustomerAudit(entities, actor, customer, summary, metadata = {}) {
  await entities.AuditEvent.create({
    event_type: 'customer_update',
    customer_id: customer.id,
    actor_id: actor?.id || null,
    actor_name: actor?.full_name || actor?.email || 'Staff',
    actor_role: actor?.role || '',
    summary,
    visibility: 'internal',
    metadata: { customer_id: customer.id, customer_account_id: customer.id, stable_customer_id: customer.customer_id || customer.id, ...metadata },
  }).catch(() => null);
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

async function ensureCustomerRecord(entities, source) {
  const email = cleanEmail(source.email);
  const stableId = source.customer_id || source.profile_id || source.user_id || source.id;
  const matches = [
    ...(stableId ? await entities.Customer.filter({ customer_id: stableId }, '-updated_date', 1).catch(() => []) : []),
    ...(source.user_id ? await entities.Customer.filter({ user_id: source.user_id }, '-updated_date', 1).catch(() => []) : []),
    ...(email ? await entities.Customer.filter({ email }, '-updated_date', 1).catch(() => []) : []),
  ];
  const customer = matches.find(Boolean);
  const data = {
    customer_id: stableId,
    full_name: source.full_name || source.name || source.display_name || email || 'Customer',
    name: source.name || source.full_name || source.display_name || email || 'Customer',
    email,
    phone: source.phone || source.phone_e164 || source.phone_display || '',
    phone_e164: source.phone_e164 || normalizePhone(source.phone) || '',
    phone_display: source.phone_display || source.phone || source.phone_e164 || '',
    user_id: source.user_id || customer?.user_id || '',
    status: customer?.status || source.status || 'active',
    tags: Array.isArray(customer?.tags) ? customer.tags : ['customer'],
    last_activity_date: customer?.last_activity_date || source.last_activity_date || new Date().toISOString(),
  };
  if (customer) {
    const updates = {};
    for (const [key, value] of Object.entries(data)) {
      if ((value || value === '') && customer[key] !== value) updates[key] = value;
    }
    return Object.keys(updates).length ? await entities.Customer.update(customer.id, updates) : customer;
  }
  return await entities.Customer.create({ ...data, createdAt: source.createdAt || source.created_date || new Date().toISOString() });
}

async function listCustomers(entities) {
  const [rawCustomers, profiles, users, scooters, jobs] = await Promise.all([
    entities.Customer.list('-updated_date', 1000).catch(() => []),
    entities.CustomerProfile.list('-updated_at', 1000).catch(() => []),
    entities.User.list('-updated_date', 1000).catch(() => []),
    entities.Scooter.list('-updated_date', 1000).catch(() => []),
    entities.Job.list('-updated_date', 1000).catch(() => []),
  ]);

  const customersByKey = new Map();
  const remember = (customer) => {
    if (!customer?.id) return customer;
    customersByKey.set(customer.id, customer);
    if (customer.customer_id) customersByKey.set(customer.customer_id, customer);
    if (customer.email) customersByKey.set(`email:${cleanEmail(customer.email)}`, customer);
    if (customer.user_id) customersByKey.set(`user:${customer.user_id}`, customer);
    return customer;
  };
  rawCustomers.forEach(remember);

  const existingFor = (source) => {
    const email = cleanEmail(source.email);
    return (source.customer_id && customersByKey.get(source.customer_id))
      || (source.user_id && customersByKey.get(`user:${source.user_id}`))
      || (email && customersByKey.get(`email:${email}`))
      || null;
  };
  const createFromSource = async (source) => {
    const found = existingFor(source);
    if (found) return remember(found);
    const email = cleanEmail(source.email);
    const phone = source.phone || source.phone_e164 || source.phone_display || '';
    const phoneE164 = source.phone_e164 || normalizePhone(phone) || '';
    const fullName = source.full_name || source.name || source.display_name || email || 'Customer';
    const created = await entities.Customer.create({
      customer_id: source.customer_id || source.profile_id || source.user_id || crypto.randomUUID(),
      full_name: fullName,
      name: source.name || fullName,
      email,
      phone: phoneE164 || phone,
      phone_e164: phoneE164,
      phone_display: source.phone_display || phone || phoneE164,
      user_id: source.user_id || '',
      status: 'active',
      tags: ['customer'],
      createdAt: source.createdAt || source.created_date || new Date().toISOString(),
      last_activity_date: source.last_activity_date || source.updated_date || new Date().toISOString(),
    });
    return remember(created);
  };

  for (const user of users.filter(isCustomerUserRecord)) {
    await createFromSource({
      user_id: user.id,
      customer_id: userField(user, 'customer_id') || user.id,
      full_name: user.full_name,
      name: user.full_name,
      email: user.email,
      phone: user.phone || user.phone_number || userField(user, 'phone'),
      phone_e164: user.phone_e164 || userField(user, 'phone_e164'),
      phone_display: user.phone_display || userField(user, 'phone_display'),
      created_date: user.created_date,
      last_activity_date: user.updated_date,
    });
  }

  for (const profile of profiles) {
    await createFromSource({
      profile_id: profile.id,
      user_id: profile.auth_user_id,
      customer_id: profile.id,
      full_name: profile.full_name || profile.display_name || profile.name,
      name: profile.name || profile.display_name || profile.full_name,
      email: profile.email,
      phone: profile.phone_e164,
      phone_e164: profile.phone_e164,
      phone_display: profile.phone_e164,
      created_date: profile.created_date || profile.created_at,
      last_activity_date: profile.updated_date || profile.updated_at,
    });
  }

  const staffUsers = users.filter(isStaff);
  const staffUserIds = new Set(staffUsers.map((user) => user.id).filter(Boolean));
  const staffEmails = new Set(staffUsers.map((user) => cleanEmail(user.email)).filter(Boolean));
  const byId = [...new Map([...customersByKey.values()].map((customer) => [customer.id, customer])).values()]
    .filter((customer) => customer.email || customer.full_name || customer.name)
    .filter((customer) => !staffUserIds.has(customer.user_id) && !staffEmails.has(cleanEmail(customer.email)));
  const byIdentity = new Map();
  const scoreCustomer = (customer) => Number(!!customer.user_id) * 4 + Number(!!customer.job_id) * 2 + Number(!!customer.customer_id);
  for (const customer of byId) {
    const key = customer.email ? `email:${cleanEmail(customer.email)}` : customer.user_id ? `user:${customer.user_id}` : `customer:${customer.customer_id || customer.id}`;
    const current = byIdentity.get(key);
    if (!current || scoreCustomer(customer) > scoreCustomer(current) || String(customer.updated_date || '') > String(current.updated_date || '')) {
      byIdentity.set(key, customer);
    }
  }
  const uniqueCustomers = [...byIdentity.values()]
    .sort((a, b) => String(b.last_activity_date || b.updated_date || b.created_date || '').localeCompare(String(a.last_activity_date || a.updated_date || a.created_date || '')));

  return uniqueCustomers.map((customer) => {
    const stableId = customer.customer_id || customer.id;
    const customerScooters = scooters.filter((s) => s.customer_id === stableId || s.customer_id === customer.id);
    const customerJobs = jobs.filter((j) => j.customer_id === stableId || j.customer_profile_id === stableId || j.customer_account_id === customer.id || j.customer_user_id === customer.user_id || (customer.email && cleanEmail(j.customer_email) === cleanEmail(customer.email)));
    const latestJobDate = customerJobs.reduce((latest, job) => {
      const date = job.updated_date || job.created_date || '';
      return date > latest ? date : latest;
    }, '');
    return {
      ...customer,
      scooter_count: customerScooters.length,
      scooters: customerScooters.slice(0, 3).map((s) => [s.make, s.model].filter(Boolean).join(' ') || s.model || 'Scooter'),
      job_count: customerJobs.length,
      last_job_date: latestJobDate,
      last_activity_date: customer.last_activity_date || latestJobDate || customer.updated_date,
    };
  });
}

async function checkDuplicateContact(entities, email, phone, excludeCustomerId) {
  const results = { emailConflict: null, phoneConflict: null };
  if (email) {
    const byEmail = await entities.Customer.filter({ email: cleanEmail(email) }, '-updated_date', 10).catch(() => []);
    results.emailConflict = byEmail.find((c) => c.id !== excludeCustomerId) || null;
  }
  if (phone) {
    const byPhone = await entities.Customer.filter({ phone_e164: normalizePhone(phone) || phone }, '-updated_date', 10).catch(() => []);
    results.phoneConflict = byPhone.find((c) => c.id !== excludeCustomerId) || null;
  }
  return results;
}

async function saveScooter(entities, actor, payload) {
  const data = payload.data || {};
  const existing = payload.scooter_id ? await entities.Scooter.get(payload.scooter_id).catch(() => null) : null;
  const customerId = payload.customer_id || existing?.customer_id;
  if (!customerId) throw new Error('customer_id is required');
  if (!String(data.model || '').trim()) throw new Error('Scooter model is required');
  const scooter = payload.scooter_id
    ? await entities.Scooter.update(payload.scooter_id, data)
    : await entities.Scooter.create({ ...data, customer_id: customerId });
  await entities.AuditEvent.create({
    event_type: 'customer_update',
    customer_id: customerId,
    actor_id: actor?.id || null,
    actor_name: actor?.full_name || actor?.email || 'Staff',
    actor_role: actor?.role || '',
    summary: `Scooter ${payload.scooter_id ? 'updated' : 'added'}: ${[data.make, data.model].filter(Boolean).join(' ')}`,
    visibility: 'internal',
    metadata: { customer_id: customerId, scooter_id: scooter.id },
  }).catch(() => null);
  return scooter;
}

async function removeScooter(entities, actor, payload) {
  if (!payload.scooter_id) throw new Error('scooter_id is required');
  const existing = await entities.Scooter.get(payload.scooter_id).catch(() => null);
  const customerId = payload.customer_id || existing?.customer_id || '';
  await entities.Scooter.delete(payload.scooter_id);
  await entities.AuditEvent.create({
    event_type: 'customer_update',
    customer_id: customerId,
    actor_id: actor?.id || null,
    actor_name: actor?.full_name || actor?.email || 'Staff',
    actor_role: actor?.role || '',
    summary: 'Scooter removed',
    visibility: 'internal',
    metadata: { customer_id: customerId, scooter_id: payload.scooter_id },
  }).catch(() => null);
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isStaff(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const action = payload.action;
    const entities = base44.asServiceRole.entities;

    if (action === 'list') return Response.json({ customers: await listCustomers(entities) });
    if (action === 'get') return Response.json({ customer: await entities.Customer.get(payload.customer_id) });
    if (action === 'resolveForJob') return Response.json({ customer: await resolveCustomerForJob(entities, payload.job_id, payload.job) });
    if (action === 'update') return Response.json({ customer: await updateCustomer(entities, user, payload.customer_id, payload.changes || {}) });
    if (action === 'saveScooter') return Response.json({ scooter: await saveScooter(entities, user, payload) });
    if (action === 'deleteScooter') { await removeScooter(entities, user, payload); return Response.json({ success: true }); }
    if (action === 'checkDuplicateContact') return Response.json(await checkDuplicateContact(entities, payload.email, payload.phone, payload.exclude_customer_id));

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[customerActions] failed:', error?.message, error?.stack);
    return Response.json({ error: error.message || 'Customer action failed' }, { status: 500 });
  }
});