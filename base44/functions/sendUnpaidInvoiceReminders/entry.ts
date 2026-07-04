import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const REMINDER_AFTER_DAYS = 7;
const RESEND_API_URL = 'https://api.resend.com/emails';
const UNPAID_STATUSES = new Set(['unpaid', 'outstanding']);

const formatCurrency = (amount, currency = 'AUD') => {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(Number(amount) || 0);
  } catch {
    return `${currency} ${(Number(amount) || 0).toFixed(2)}`;
  }
};

const daysBetween = (from, to = new Date()) => {
  if (!from) return 0;
  return Math.floor((to.getTime() - new Date(from).getTime()) / 86400000);
};

const getCustomerDetails = async (base44, invoice, job) => {
  if (invoice.customer_id) {
    const customers = await base44.asServiceRole.entities.Customer.filter({ customer_id: invoice.customer_id }, '-updated_date', 1);
    if (customers[0]?.email) return customers[0];
  }

  if (job?.customer_id) {
    const customers = await base44.asServiceRole.entities.Customer.filter({ customer_id: job.customer_id }, '-updated_date', 1);
    if (customers[0]?.email) return customers[0];
  }

  return {
    full_name: job?.customer_name || 'Customer',
    email: job?.customer_email || '',
    phone: job?.customer_phone || '',
  };
};

const sendEmail = async ({ to, customerName, invoice, job }) => {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const invoiceNumber = invoice.number || invoice.invoice_id || invoice.id;
  const jobReference = job?.reference || job?.job_id || job?.id || invoice.job_id;
  const amount = formatCurrency(invoice.amount, invoice.currency || 'AUD');

  const body = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:620px">
      <p>Hi ${customerName || 'there'},</p>
      <p>This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> for job <strong>${jobReference}</strong> remains unpaid after more than ${REMINDER_AFTER_DAYS} days.</p>
      <p><strong>Amount due:</strong> ${amount}</p>
      <p>Please log in to your customer portal to view and pay the invoice, or contact us if you have already made payment.</p>
      <p>Thank you,<br/>On The Run Electrics</p>
    </div>
  `;

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'On The Run Electrics <hello@ontherunelectrics.com.au>',
      to,
      subject: `Payment reminder for invoice ${invoiceNumber}`,
      html: body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email send failed: ${text}`);
  }
};

Deno.serve(async (req) => {
  const requestMeta = { fn: 'sendUnpaidInvoiceReminders' };

  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const dryRun = Boolean(payload.dryRun);
    const now = new Date();
    const invoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 200);
    const eligible = invoices.filter((invoice) => {
      const status = invoice.status || 'outstanding';
      const ageDays = daysBetween(invoice.created_date, now);
      const reminderAgeDays = invoice.last_payment_reminder_sent_date ? daysBetween(invoice.last_payment_reminder_sent_date, now) : 999;
      return UNPAID_STATUSES.has(status) && ageDays > REMINDER_AFTER_DAYS && reminderAgeDays >= REMINDER_AFTER_DAYS;
    });

    const results = [];

    for (const invoice of eligible) {
      requestMeta.invoiceId = invoice.id;
      let job = null;
      try {
        job = invoice.job_id ? await base44.asServiceRole.entities.Job.get(invoice.job_id) : null;
      } catch {
        const jobs = invoice.job_id ? await base44.asServiceRole.entities.Job.filter({ job_id: invoice.job_id }, '-created_date', 1) : [];
        job = jobs[0] || null;
      }

      const customer = await getCustomerDetails(base44, invoice, job);
      if (!customer.email) {
        results.push({ invoice_id: invoice.id, sent: false, reason: 'No customer email on file' });
        continue;
      }

      if (!dryRun) {
        await sendEmail({
          to: customer.email,
          customerName: customer.full_name || job?.customer_name,
          invoice,
          job,
        });

        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          last_payment_reminder_sent_date: now.toISOString(),
          payment_reminder_count: (Number(invoice.payment_reminder_count) || 0) + 1,
        });

        await base44.asServiceRole.entities.AuditEvent.create({
          event_type: 'invoice_payment_reminder_sent',
          job_id: job?.job_id || job?.id || invoice.job_id,
          customer_id: invoice.customer_id || job?.customer_id || customer.customer_id || '',
          actor_name: 'System',
          actor_role: 'system',
          summary: `Payment reminder sent for invoice ${invoice.number || invoice.id}`,
          visibility: 'customer',
          metadata: { invoice_id: invoice.id, to: customer.email },
        });
      }

      results.push({ invoice_id: invoice.id, invoice_number: invoice.number, sent: !dryRun, to: customer.email });
    }

    return Response.json({ checked: invoices.length, eligible: eligible.length, dryRun, results });
  } catch (error) {
    console.error('[sendUnpaidInvoiceReminders] failed', JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    return Response.json({ error: error.message || 'Failed to send invoice reminders' }, { status: 500 });
  }
});