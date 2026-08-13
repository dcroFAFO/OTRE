import {
  addIdList,
  cleanEmail,
  cleanText,
  logCustomerAudit,
  normalizePhone,
  resolveStaffContext,
  scooterMatches,
} from '../../shared/customerCore.ts';

// Customer scooter (asset) management. Scooter changes are audited against the
// owning customer so they appear on the customer history timeline.

async function findOrCreateScooterForCustomer(entities, customer, data = {}, jobId = '') {
  const stableId = customer.customer_id || customer.id;
  const accountId = customer.id;
  const payload = {
    make: data.make || data.scooterMake || data.scooterBrand || '',
    model: data.model || data.scooterModel || '',
    year: data.year || '',
    serial_number: data.serial_number || data.serialNumber || '',
    colour: data.colour || data.color || '',
    color: data.color || data.colour || '',
    battery_voltage: data.battery_voltage || '',
    odometer_km: data.odometer_km ? Number(data.odometer_km) : undefined,
    notes: data.notes || data.physical_condition || data.initial_issue_notes || '',
    intake: data.intake || undefined,
  };
  if (!payload.make && !payload.model && !payload.serial_number) return null;
  const [byStable, byAccount] = await Promise.all([
    entities.Scooter.filter({ customer_id: stableId }, '-updated_date', 100).catch(() => []),
    entities.Scooter.filter({ customer_account_id: accountId }, '-updated_date', 100).catch(() => []),
  ]);
  const scooters = [...new Map([...byStable, ...byAccount].map((s) => [s.id, s])).values()];
  const existing = scooters.find((s) => scooterMatches(s, payload));
  if (existing) {
    const updates = { customer_id: stableId, customer_account_id: accountId };
    if (jobId) updates.job_id = addIdList(existing.job_id, jobId);
    for (const key of ['make', 'model', 'year', 'serial_number', 'colour', 'color', 'battery_voltage', 'notes', 'intake']) {
      if (payload[key] && !existing[key]) updates[key] = payload[key];
    }
    if (payload.odometer_km && !existing.odometer_km) updates.odometer_km = payload.odometer_km;
    return Object.keys(updates).length ? await entities.Scooter.update(existing.id, updates) : existing;
  }
  return await entities.Scooter.create({ ...payload, customer_id: stableId, customer_account_id: accountId, job_id: jobId || '' });
}

async function listScootersForCustomer(entities, customerId) {
  const customer = await entities.Customer.get(customerId);
  if (!customer) throw new Error('Customer not found');
  const stableId = customer.customer_id || customer.id;
  const email = cleanEmail(customer.email);
  const phone = normalizePhone(customer.phone_e164 || customer.phone || customer.phone_display);
  const [byStable, byAccount, jobsByStable, jobsByAccount, jobsByEmail, jobsByPhone] = await Promise.all([
    entities.Scooter.filter({ customer_id: stableId }, 'make', 100).catch(() => []),
    entities.Scooter.filter({ customer_account_id: customer.id }, 'make', 100).catch(() => []),
    entities.Job.filter({ customer_id: stableId }, '-created_date', 200).catch(() => []),
    entities.Job.filter({ customer_account_id: customer.id }, '-created_date', 200).catch(() => []),
    email ? entities.Job.filter({ customer_email: customer.email }, '-created_date', 200).catch(() => []) : [],
    phone ? entities.Job.filter({ customer_phone_e164: phone }, '-created_date', 200).catch(() => []) : [],
  ]);
  const jobs = [...new Map([...jobsByStable, ...jobsByAccount, ...jobsByEmail, ...jobsByPhone].filter((job) => {
    if (job.customer_id && job.customer_id !== stableId && job.customer_id !== customer.id) return false;
    if (job.customer_account_id && job.customer_account_id !== customer.id) return false;
    return true;
  }).map((job) => [job.id, job])).values()];
  const scooters = [...new Map([...byStable, ...byAccount].map((s) => [s.id, s])).values()];
  return scooters.map((scooter) => {
    const label = [scooter.make, scooter.model].filter(Boolean).join(' ');
    const relatedJobs = jobs.filter((job) => job.asset_id === scooter.id || cleanText(job.asset_label || job.scooter_make_model || job.scooter_details) === cleanText(label));
    const lastServiceDate = relatedJobs.reduce((latest, job) => {
      const date = job.scheduled_date || job.created_date || '';
      return date > latest ? date : latest;
    }, scooter.last_service_date || '');
    return { ...scooter, related_job_count: relatedJobs.length, last_service_date: lastServiceDate };
  });
}

async function findCustomerRecord(entities, customerId) {
  const direct = await entities.Customer.get(customerId).catch(() => null);
  if (direct) return direct;
  const matches = await entities.Customer.filter({ customer_id: customerId }, '-updated_date', 1).catch(() => []);
  return matches[0] || null;
}

async function saveScooter(entities, actor, payload) {
  const data = payload.data || {};
  const existing = payload.scooter_id ? await entities.Scooter.get(payload.scooter_id).catch(() => null) : null;
  // Assets managed from the staff Asset Management screen can legitimately have
  // no owner yet, so a missing customer is allowed here. When one IS supplied it
  // must resolve, otherwise we'd silently detach the asset from its customer.
  const customerId = payload.customer_id || existing?.customer_account_id || existing?.customer_id || '';
  if (!String(data.model || '').trim()) throw new Error('Scooter model is required');
  const customer = customerId ? await findCustomerRecord(entities, customerId) : null;
  if (customerId && !customer) throw new Error('Customer not found');
  const ownership = customer ? { customer_id: customer.customer_id || customer.id, customer_account_id: customer.id } : {};
  let scooter;
  if (payload.scooter_id) scooter = await entities.Scooter.update(payload.scooter_id, { ...data, ...ownership });
  else if (customer) scooter = await findOrCreateScooterForCustomer(entities, customer, data);
  else scooter = await entities.Scooter.create({ ...data });
  await logCustomerAudit(
    entities,
    actor,
    customer || { id: '' },
    `Scooter ${payload.scooter_id ? 'updated' : 'added'}: ${[data.make, data.model].filter(Boolean).join(' ')}`,
    { scooter_id: scooter?.id || '' },
  );
  return scooter;
}

async function removeScooter(entities, actor, payload) {
  if (!payload.scooter_id) throw new Error('scooter_id is required');
  const existing = await entities.Scooter.get(payload.scooter_id).catch(() => null);
  const customerId = payload.customer_id || existing?.customer_id || '';
  await entities.Scooter.delete(payload.scooter_id);
  await logCustomerAudit(entities, actor, { id: customerId }, 'Scooter removed', { scooter_id: payload.scooter_id });
}

Deno.serve(async (req) => {
  try {
    const ctx = await resolveStaffContext(req);
    if (ctx.error) return ctx.error;
    const { user, entities } = ctx;

    const payload = await req.json().catch(() => ({}));
    const action = payload.action;

    if (action === 'listScooters') return Response.json({ scooters: await listScootersForCustomer(entities, payload.customer_id) });
    if (action === 'saveScooter') return Response.json({ scooter: await saveScooter(entities, user, payload) });
    if (action === 'deleteScooter') { await removeScooter(entities, user, payload); return Response.json({ success: true }); }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[scooterActions] failed:', error?.message, error?.stack);
    return Response.json({ error: 'The asset action could not be completed.' }, { status: 500 });
  }
});
