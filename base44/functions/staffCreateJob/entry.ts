import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : '';
}

function generateJobReference() {
  const prefix = 'OTR';
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${num}`;
}

function generateCustomerId() {
  return `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function sendMail({ to, subject, body }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) { console.warn('RESEND_API_KEY not set — skipping email'); return; }
  const from = `On The Run Electrics <hello@ontherunelectrics.com.au>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html: body }),
  });
  if (!res.ok) console.error('Email send failed:', await res.text());
}

function customerWelcomeHtml({ name, email, reference }) {
  const firstName = (name || 'there').split(' ')[0];
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">On The Run Electrics</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Your repair job has been created</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">A repair job has been created for your scooter by our team. Your job reference is <strong>${reference}</strong>.</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Our team will be in touch shortly with updates on your repair progress.</p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">Questions? Reply to this email or call us on <strong>0415 505 908</strong>.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">On The Run Electrics · 11 Lucinda Street Woolloongabba QLD · 0415 505 908 · hello@ontherunelectrics.com.au</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const staffRoles = new Set(['admin', 'employee', 'technician', 'staff']);
    if (!staffRoles.has(String(user.role || '').toLowerCase())) {
      return Response.json({ error: 'Forbidden — staff only' }, { status: 403 });
    }

    const { intake, linked_customer_id, template } = await req.json();

    if (!intake?.customerName?.trim()) {
      return Response.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const email = normalizeEmail(intake.customerEmail || '');
    const phone = normalizePhone(intake.customerPhone || '');
    const assetLabel = [intake.make, intake.model].filter(Boolean).join(' ') || intake.asset_label || '';
    const reference = generateJobReference();

    // --- Customer resolution ---
    let customerId = null;
    let customerRecordId = null;
    let isNewCustomer = false;

    if (linked_customer_id) {
      // Staff explicitly linked to an existing customer
      const existing = await base44.asServiceRole.entities.Customer.filter({ customer_id: linked_customer_id });
      if (existing.length > 0) {
        customerId = existing[0].customer_id;
        customerRecordId = existing[0].id;
      }
    }

    if (!customerId && email) {
      const byEmail = await base44.asServiceRole.entities.Customer.filter({ email });
      if (byEmail.length > 0) {
        customerId = byEmail[0].customer_id;
        customerRecordId = byEmail[0].id;
      }
    }

    if (!customerId && phone) {
      const byPhone = await base44.asServiceRole.entities.Customer.filter({ phone_e164: phone });
      if (byPhone.length > 0) {
        customerId = byPhone[0].customer_id;
        customerRecordId = byPhone[0].id;
      }
    }

    if (!customerId) {
      // Create new customer record
      isNewCustomer = true;
      customerId = generateCustomerId();
      const newCustomer = await base44.asServiceRole.entities.Customer.create({
        customer_id: customerId,
        full_name: intake.customerName.trim(),
        email: email || undefined,
        phone: phone || intake.customerPhone || undefined,
        phone_e164: phone || undefined,
        phone_display: intake.customerPhone || undefined,
        status: 'active',
        tags: ['customer'],
        last_activity_date: new Date().toISOString(),
      });
      customerRecordId = newCustomer.id;
    } else {
      // Update last activity on existing customer
      await base44.asServiceRole.entities.Customer.update(customerRecordId, {
        last_activity_date: new Date().toISOString(),
      });
    }

    // --- Build intake record ---
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
      intake_date: new Date().toISOString(),
    };

    // --- Create job ---
    const job = await base44.asServiceRole.entities.Job.create({
      customer_name: intake.customerName?.trim() || '',
      customer_email: email || intake.customerEmail || '',
      customer_phone: intake.customerPhone || '',
      customer_phone_e164: phone || '',
      asset_label: assetLabel,
      scooter_make_model: assetLabel,
      issue_description: intakeRecord.initial_issue_notes,
      service_type: intakeRecord.service_type,
      status: 'booked',
      source: 'staff_created',
      priority: intake.priority || 'medium',
      scheduled_date: intake.date || undefined,
      rideable: typeof intake.isRideable === 'boolean' ? intake.isRideable : true,
      customer_id: customerId,
      customer_account_id: customerId,
      reference,
      intake: intakeRecord,
      checklist: (template?.checklist || []).map((c) => ({ ...c, done: false })),
      parts_required: template?.parts_required || [],
    });

    // Update customer with job reference
    await base44.asServiceRole.entities.Customer.update(customerRecordId, {
      job_id: customerId,
      last_activity_date: new Date().toISOString(),
    });

    // Send welcome email for new customers
    if (isNewCustomer && email) {
      await sendMail({
        to: email,
        subject: `Your repair job has been created — On The Run Electrics (${reference})`,
        body: customerWelcomeHtml({ name: intake.customerName, email, reference }),
      }).catch((err) => console.warn('Welcome email failed (non-fatal):', err.message));
    }

    console.log(`[staffCreateJob] Job ${job.id} created for customer ${customerId} (new: ${isNewCustomer}) by ${user.full_name}`);
    return Response.json({ success: true, job, customer_id: customerId, is_new_customer: isNewCustomer, reference });

  } catch (error) {
    console.error('[staffCreateJob] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});