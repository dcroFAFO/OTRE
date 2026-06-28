import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);

function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
function cleanText(value) { return String(value || '').trim().toLowerCase(); }
function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : '';
}
function generateJobReference() { return `OTR-${Math.floor(Math.random() * 90000) + 10000}`; }
function generateCustomerId() { return `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }
function addIdList(existing, nextId) {
  const ids = String(existing || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (nextId && !ids.includes(nextId)) ids.push(nextId);
  return ids.join(',');
}
function scooterMatches(a, b) {
  const aSerial = cleanText(a.serial_number);
  const bSerial = cleanText(b.serial_number);
  if (aSerial && bSerial && aSerial === bSerial) return true;
  return !!cleanText(a.model) && cleanText(a.make) === cleanText(b.make) && cleanText(a.model) === cleanText(b.model);
}

async function sendMail({ to, subject, body }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) { console.warn('RESEND_API_KEY not set — skipping email'); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'On The Run Electrics <hello@ontherunelectrics.com.au>', to: [to], subject, html: body }),
  });
  if (!res.ok) console.error('Email send failed:', await res.text());
}

function customerWelcomeHtml({ name, reference }) {
  const firstName = (name || 'there').split(' ')[0];
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;"><div style="max-width:560px;margin:auto;background:white;border-radius:12px;padding:32px;"><h1>Your repair job has been created</h1><p>Hi ${firstName},</p><p>A repair job has been created for your scooter. Your job reference is <strong>${reference}</strong>.</p><p>Our team will be in touch shortly.</p></div></body></html>`;
}

async function resolveCustomer(entities, { linkedCustomerId, name, email, phone }) {
  let customer = null;
  if (linkedCustomerId) {
    customer = await entities.Customer.get(linkedCustomerId).catch(() => null);
    if (!customer) {
      const matches = await entities.Customer.filter({ customer_id: linkedCustomerId }, '-updated_date', 1).catch(() => []);
      customer = matches[0] || null;
    }
  }
  if (!customer && email) {
    const matches = await entities.Customer.filter({ email }, '-updated_date', 1).catch(() => []);
    customer = matches[0] || null;
  }
  if (!customer && phone) {
    const matches = await entities.Customer.filter({ phone_e164: phone }, '-updated_date', 1).catch(() => []);
    customer = matches[0] || null;
  }
  if (customer) return { customer, isNewCustomer: false };
  const now = new Date().toISOString();
  customer = await entities.Customer.create({
    customer_id: generateCustomerId(),
    full_name: name,
    name,
    email: email || undefined,
    phone: phone || undefined,
    phone_e164: phone || undefined,
    phone_display: phone || undefined,
    status: 'active',
    tags: ['customer'],
    createdAt: now,
    last_activity_date: now,
  });
  return { customer, isNewCustomer: true };
}

async function resolveScooter(entities, customer, intake) {
  const stableId = customer.customer_id || customer.id;
  const data = {
    make: intake.make || '',
    model: intake.model || '',
    serial_number: intake.serial_number || '',
    colour: intake.colour || intake.color || '',
    color: intake.color || intake.colour || '',
    battery_voltage: intake.battery_voltage || '',
    odometer_km: intake.odometer_km ? Number(intake.odometer_km) : undefined,
    notes: [intake.physical_condition, intake.accessories_received].filter(Boolean).join('\n'),
  };
  if (!data.make && !data.model && !data.serial_number) return null;
  const [byStable, byAccount] = await Promise.all([
    entities.Scooter.filter({ customer_id: stableId }, '-updated_date', 100).catch(() => []),
    entities.Scooter.filter({ customer_account_id: customer.id }, '-updated_date', 100).catch(() => []),
  ]);
  const existing = [...new Map([...byStable, ...byAccount].map((s) => [s.id, s])).values()].find((s) => scooterMatches(s, data));
  if (existing) {
    const updates = { customer_id: stableId, customer_account_id: customer.id };
    for (const key of ['make', 'model', 'serial_number', 'colour', 'color', 'battery_voltage', 'notes']) if (data[key] && !existing[key]) updates[key] = data[key];
    if (data.odometer_km && !existing.odometer_km) updates.odometer_km = data.odometer_km;
    return await entities.Scooter.update(existing.id, updates);
  }
  return await entities.Scooter.create({ ...data, customer_id: stableId, customer_account_id: customer.id });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.has(String(user.role || '').toLowerCase())) return Response.json({ error: 'Forbidden — staff only' }, { status: 403 });

    const { intake, linked_customer_id, template } = await req.json();
    if (!intake?.customerName?.trim()) return Response.json({ error: 'Customer name is required' }, { status: 400 });

    const entities = base44.asServiceRole.entities;
    const email = normalizeEmail(intake.customerEmail || '');
    const phone = normalizePhone(intake.customerPhone || '');
    const { customer, isNewCustomer } = await resolveCustomer(entities, { linkedCustomerId: linked_customer_id, name: intake.customerName.trim(), email, phone });
    const stableCustomerId = customer.customer_id || customer.id;
    const scooter = await resolveScooter(entities, customer, intake);
    const assetLabel = scooter ? [scooter.make, scooter.model].filter(Boolean).join(' ') : ([intake.make, intake.model].filter(Boolean).join(' ') || intake.asset_label || '');
    const reference = generateJobReference();
    const now = new Date().toISOString();

    const intakeRecord = {
      customerName: intake.customerName?.trim() || '',
      customerEmail: email || intake.customerEmail || '',
      customerPhone: intake.customerPhone || '',
      make: intake.make || '',
      model: intake.model || '',
      scooterMake: intake.make || '',
      scooterModel: intake.model || '',
      serial_number: intake.serial_number || '',
      battery_condition: intake.battery_condition || '',
      battery_voltage: intake.battery_voltage || '',
      odometer_km: intake.odometer_km ? Number(intake.odometer_km) : undefined,
      physical_condition: intake.physical_condition || '',
      accessories_received: intake.accessories_received || '',
      powers_on: intake.powers_on !== false,
      initial_issue_notes: intake.initial_issue_notes || intake.issueOrService || '',
      issueOrService: intake.issueOrService || intake.initial_issue_notes || '',
      service_type: intake.service_type || 'general_repair',
      date: intake.date || '',
      isRideable: typeof intake.isRideable === 'boolean' ? intake.isRideable : undefined,
      intake_by_name: user.full_name || 'Staff',
      intake_date: now,
    };

    const job = await entities.Job.create({
      customer_name: intake.customerName?.trim() || '',
      customer_email: email || intake.customerEmail || '',
      customer_phone: intake.customerPhone || '',
      customer_phone_e164: phone || '',
      asset_id: scooter?.id || '',
      asset_label: assetLabel,
      scooter_make_model: assetLabel,
      scooter_details: assetLabel,
      issue_description: intakeRecord.initial_issue_notes,
      service_type: intakeRecord.service_type,
      status: 'booked',
      source: 'staff_created',
      priority: intake.priority || 'medium',
      scheduled_date: intake.date || undefined,
      rideable: typeof intake.isRideable === 'boolean' ? intake.isRideable : true,
      customer_id: stableCustomerId,
      customer_account_id: customer.id,
      customer_user_id: customer.user_id || '',
      reference,
      intake: intakeRecord,
      checklist: (template?.checklist || []).map((c) => ({ ...c, done: false })),
      parts_required: template?.parts_required || [],
    });

    if (scooter?.id) await entities.Scooter.update(scooter.id, { job_id: addIdList(scooter.job_id, job.id), last_service_date: intake.date || scooter.last_service_date || '' }).catch(() => null);
    await entities.Customer.update(customer.id, { job_id: addIdList(customer.job_id, job.id), last_activity_date: now }).catch(() => null);

    if (isNewCustomer && email) await sendMail({ to: email, subject: `Your repair job has been created — On The Run Electrics (${reference})`, body: customerWelcomeHtml({ name: intake.customerName, reference }) }).catch((err) => console.warn('Welcome email failed:', err.message));

    console.log(`[staffCreateJob] Job ${job.id} created for customer ${stableCustomerId} by ${user.full_name}`);
    return Response.json({ success: true, job, customer_id: stableCustomerId, customer_account_id: customer.id, asset_id: scooter?.id || '', is_new_customer: isNewCustomer, reference });
  } catch (error) {
    console.error('[staffCreateJob] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});