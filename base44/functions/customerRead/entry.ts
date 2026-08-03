import {
  cleanEmail,
  isCustomerUserRecord,
  isStaff,
  normalizePhone,
  resolveStaffContext,
  userField,
} from '../../shared/customerCore.ts';

// Read-only customer queries for the admin client list. Any staff role may read.

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
  // Build an in-memory customer object for sources without an existing Customer
  // record. Listing must NOT persist new records — otherwise deleted customers
  // are immediately recreated on the next list fetch, making deletes appear to fail.
  const buildFromSource = (source) => {
    const found = existingFor(source);
    if (found) return found;
    const email = cleanEmail(source.email);
    const phone = source.phone || source.phone_e164 || source.phone_display || '';
    const phoneE164 = source.phone_e164 || normalizePhone(phone) || '';
    const fullName = source.full_name || source.name || source.display_name || email || 'Customer';
    return {
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
    };
  };

  const virtualCustomers = [];
  for (const user of users.filter(isCustomerUserRecord)) {
    const virtual = buildFromSource({
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
    if (!virtual.id) virtualCustomers.push(virtual);
  }

  for (const profile of profiles) {
    const virtual = buildFromSource({
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
    if (!virtual.id) virtualCustomers.push(virtual);
  }

  const staffUsers = users.filter(isStaff);
  const staffUserIds = new Set(staffUsers.map((user) => user.id).filter(Boolean));
  const staffEmails = new Set(staffUsers.map((user) => cleanEmail(user.email)).filter(Boolean));
  const byId = [...new Map([...customersByKey.values(), ...virtualCustomers].map((customer) => [customer.id || customer.customer_id || customer.user_id, customer])).values()]
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
    const normalizedPhone = normalizePhone(customer.phone_e164 || customer.phone || customer.phone_display);
    const customerScooters = scooters.filter((s) => s.customer_id === stableId || s.customer_id === customer.id || s.customer_account_id === customer.id);
    const customerJobs = jobs.filter((j) => {
      if (j.customer_id && j.customer_id !== stableId && j.customer_id !== customer.id) return false;
      if (j.customer_account_id && j.customer_account_id !== customer.id) return false;
      if (j.customer_id === stableId || j.customerId === stableId || j.customer_profile_id === stableId || j.customer_account_id === customer.id || (customer.user_id && j.customer_user_id === customer.user_id)) return true;
      const emailMatches = customer.email && cleanEmail(j.customer_email) === cleanEmail(customer.email);
      const phoneMatches = normalizedPhone && normalizePhone(j.customer_phone_e164 || j.customer_phone || j.customer_phone_display) === normalizedPhone;
      return (emailMatches || phoneMatches) && !j.customer_id && !j.customer_account_id && !j.customer_user_id;
    });
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

Deno.serve(async (req) => {
  try {
    const ctx = await resolveStaffContext(req);
    if (ctx.error) return ctx.error;
    const { entities } = ctx;

    const payload = await req.json().catch(() => ({}));
    const action = payload.action;

    if (action === 'list') return Response.json({ customers: await listCustomers(entities) });
    if (action === 'get') return Response.json({ customer: await entities.Customer.get(payload.customer_id) });
    if (action === 'checkDuplicateContact') return Response.json(await checkDuplicateContact(entities, payload.email, payload.phone, payload.exclude_customer_id));

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[customerRead] failed:', error?.message, error?.stack);
    return Response.json({ error: error.message || 'Customer read failed' }, { status: 500 });
  }
});