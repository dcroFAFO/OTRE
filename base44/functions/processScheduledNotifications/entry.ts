import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);
const BUSINESS_NAME = "On The Run Electrics";
const FROM_EMAIL = "On The Run Electrics <hello@ontherunelectrics.com.au>";
const BUSINESS_PHONE = "0415 505 908";
const OVERDUE_HOURS = 24;
const FEEDBACK_DELAY_HOURS = 12;
const REMINDER_INTERVAL_HOURS = 24;

function fmtMoney(amount, currency = 'AUD') { return `${currency} ${Number(amount || 0).toFixed(2)}`; }

function emailTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
<div style="background:#0ea5e9;padding:20px 24px;border-radius:12px 12px 0 0;"><h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">${BUSINESS_NAME}</h1></div>
<div style="background:#f8fafc;padding:28px 24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">${content}</div>
<p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;line-height:1.6;">${BUSINESS_NAME} · Woolloongabba, Brisbane<br>hello@ontherunelectrics.com.au · ${BUSINESS_PHONE}</p>
</body></html>`;
}

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    if (!res.ok) { console.error('[processScheduled] email failed:', await res.text()); return false; }
    return true;
  } catch (e) { console.error('[processScheduled] email error:', e.message); return false; }
}

async function sendSMS(to, body) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER || !to || !to.startsWith('+')) return false;
  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: TWILIO_FROM_NUMBER, To: to, Body: body }),
    });
    if (!res.ok) { console.error('[processScheduled] SMS failed:', await res.text()); return false; }
    return true;
  } catch (e) { console.error('[processScheduled] SMS error:', e.message); return false; }
}

async function getStaffUsers(base44) {
  const users = await base44.asServiceRole.entities.User.list('-created_date', 200).catch(() => []);
  return users.filter((u) => STAFF_ROLES.has(String(u.role || '').toLowerCase()) && u.email);
}

async function alreadySent(base44, key) {
  const existing = await base44.asServiceRole.entities.AuditEvent.filter({ event_type: key }, '-created_date', 1).catch(() => []);
  return existing.length > 0;
}

async function markSent(base44, key, summary) {
  await base44.asServiceRole.entities.AuditEvent.create({ event_type: key, summary, visibility: 'system' }).catch(() => {});
}

function hoursSince(dateStr) {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const origin = req.headers.get('origin') || '';
    const results = { overdue: 0, feedback: 0 };

    // ── OVERDUE INVOICE REMINDERS ──
    const invoices = await db.Invoice.list('-created_date', 500).catch(() => []);
    const overdueInvoices = invoices.filter((inv) => {
      if (inv.status !== 'outstanding') return false;
      if (!inv.invoiceSentAt) return false;
      if (hoursSince(inv.invoiceSentAt) < OVERDUE_HOURS) return false;
      const lastReminder = inv.last_payment_reminder_sent_date;
      if (lastReminder && hoursSince(lastReminder) < REMINDER_INTERVAL_HOURS) return false;
      return true;
    });

    for (const invoice of overdueInvoices) {
      const job = invoice.job_id ? await db.Job.get(invoice.job_id).catch(() => null) : null;
      const customerName = job?.customer_name || 'there';
      const customerEmail = job?.customer_email || '';
      const customerPhone = job?.customer_phone_e164 || '';
      const ref = job?.reference || invoice.id;
      const amount = fmtMoney(invoice.amount, invoice.currency);

      // Customer email
      if (customerEmail) {
        const subject = `Payment reminder — Invoice ${invoice.number || ''}`;
        const body = `<p>Hi ${customerName},</p><p>This is a friendly reminder that your invoice ${invoice.number || ''} for <strong>${amount}</strong> is overdue. Please pay online at your earliest convenience.</p><p style="margin-top:24px;"><a href="${origin}/portal" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Pay Now</a></p>`;
        await sendEmail(customerEmail, subject, emailTemplate(body));
      }

      // Customer SMS
      if (customerPhone) {
        const msg = `Hi ${customerName}, your invoice ${invoice.number || ''} (${amount}) is overdue. Please pay online: ${origin}/portal`;
        await sendSMS(customerPhone, msg);
      }

      // Staff email
      const staff = await getStaffUsers(base44);
      const staffSubject = `Overdue invoice — ${invoice.number || ref}`;
      const staffBody = `<p>Invoice ${invoice.number || ''} for ${customerName} (${amount}) is overdue.</p><p style="margin-top:16px;"><a href="${origin}/dashboard/invoices" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View Dashboard</a></p>`;
      for (const s of staff) await sendEmail(s.email, staffSubject, emailTemplate(staffBody));

      // Update reminder tracking
      await db.Invoice.update(invoice.id, {
        last_payment_reminder_sent_date: new Date().toISOString(),
        payment_reminder_count: (invoice.payment_reminder_count || 0) + 1,
      }).catch(() => {});

      await markSent(base44, `notif:invoice_overdue:${invoice.id}:${Date.now()}`, `Overdue reminder sent for ${ref}`);
      results.overdue++;
    }

    // ── FEEDBACK EMAILS (12h after payment) ──
    const paidInvoices = invoices.filter((inv) => {
      if (inv.status !== 'paid') return false;
      if (!inv.paid_date) return false;
      if (hoursSince(inv.paid_date) < FEEDBACK_DELAY_HOURS) return false;
      return true;
    });

    for (const invoice of paidInvoices) {
      const feedbackKey = `notif:feedback_request:${invoice.id}:email`;
      if (await alreadySent(base44, feedbackKey)) continue;

      const job = invoice.job_id ? await db.Job.get(invoice.job_id).catch(() => null) : null;
      const customerName = job?.customer_name || 'there';
      const customerEmail = job?.customer_email || '';
      if (!customerEmail) continue;

      const subject = `How did we do? — ${BUSINESS_NAME}`;
      const body = `<p>Hi ${customerName},</p><p>We hope you're happy with your recent repair. We'd love to hear your feedback — it only takes a minute and helps us improve our service.</p><p style="margin-top:24px;"><a href="${origin}/feedback${job?.id ? `?job_id=${job.id}` : ''}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Leave Feedback</a></p>`;
      const sent = await sendEmail(customerEmail, subject, emailTemplate(body));
      if (sent) { await markSent(base44, feedbackKey, `Feedback email sent to ${customerEmail}`); results.feedback++; }
    }

    return Response.json({ ok: true, ...results });
  } catch (error) {
    console.error('[processScheduledNotifications] failed:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});