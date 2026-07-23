import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);
const BUSINESS_NAME = "On The Run Electrics";
const FROM_EMAIL = "On The Run Electrics <hello@ontherunelectrics.com.au>";
const BUSINESS_PHONE = "0415 505 908";

const DEFAULT_ORIGIN = "https://ontherunelectrics.com.au";

async function resolveOrigin(req, body, base44) {
  // Prefer the BusinessProfile website_url — always correct for published app.
  try {
    const profiles = await base44.asServiceRole.entities.BusinessProfile.list('-created_date', 1).catch(() => []);
    if (profiles[0]?.website_url) return profiles[0].website_url.replace(/\/$/, '');
  } catch (_) {}
  // Fall back to explicit origin in body, then request headers.
  if (body?.origin) return body.origin.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  const referer = req.headers.get('referer');
  if (referer) { try { return new URL(referer).origin.replace(/\/$/, ''); } catch (_) {} }
  return DEFAULT_ORIGIN;
}

function fmtMoney(amount, currency = 'AUD') {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch (_) { return dateStr; }
}

function emailTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
<div style="background:#0ea5e9;padding:20px 24px;border-radius:12px 12px 0 0;"><h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">${BUSINESS_NAME}</h1></div>
<div style="background:#f8fafc;padding:28px 24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">${content}</div>
<p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;line-height:1.6;">${BUSINESS_NAME} · Woolloongabba, Brisbane<br>hello@ontherunelectrics.com.au · ${BUSINESS_PHONE}</p>
</body></html>`;
}

const AUDIT_EMAIL = "info@ontherunelectrics.com.au";

async function sendEmail(to, subject, html, { audit = true } = {}) {
  if (!RESEND_API_KEY) { console.warn('[sendNotification] RESEND_API_KEY not set'); return false; }
  if (!to) { console.warn('[sendNotification] no email recipient'); return false; }
  try {
    const payload = { from: FROM_EMAIL, to: [to], subject, html };
    // BCC the business inbox on every outgoing email for staff audit visibility.
    if (audit && to !== AUDIT_EMAIL) payload.bcc = [AUDIT_EMAIL];
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { console.error('[sendNotification] email failed:', await res.text()); return false; }
    return true;
  } catch (e) { console.error('[sendNotification] email error:', e.message); return false; }
}

async function sendSMS(to, body) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) { console.warn('[sendNotification] Twilio not configured'); return false; }
  if (!to || !to.startsWith('+')) { console.warn('[sendNotification] invalid SMS number:', to); return false; }
  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: TWILIO_FROM_NUMBER, To: to, Body: body }),
    });
    if (!res.ok) { console.error('[sendNotification] SMS failed:', await res.text()); return false; }
    // Email an audit copy of every SMS to the business inbox for staff visibility.
    await sendEmail(AUDIT_EMAIL, `[SMS Audit] Sent to ${to}`, emailTemplate(
      `<p><strong>SMS sent to:</strong> ${to}</p><p><strong>Message:</strong></p><p style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px;">${body}</p>`
    ), { audit: false });
    return true;
  } catch (e) { console.error('[sendNotification] SMS error:', e.message); return false; }
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
  await base44.asServiceRole.entities.AuditEvent.create({
    event_type: key, summary, visibility: 'system',
  }).catch(() => {});
}

function trackUrl(origin, jobId) {
  return jobId ? `${origin}/track/${jobId}` : `${origin}/portal`;
}

function portalUrl(origin) { return `${origin}/portal`; }
function feedbackUrl(origin, jobId) { return `${origin}/feedback${jobId ? `?job_id=${jobId}` : ''}`; }
function dashboardUrl(origin) { return `${origin}/dashboard/jobs`; }

function isGuestBooking(job) {
  return !!job && !job.customer_user_id;
}

function registerUrl(origin, email) {
  const params = new URLSearchParams();
  if (email) params.set('email', email);
  params.set('customerFlow', '1');
  return `${origin}/register?${params.toString()}`;
}

function guestPerksBlock(origin, email) {
  return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-top:24px;">
<p style="margin:0 0 8px;font-weight:600;color:#166534;">Create a free account to unlock:</p>
<ul style="margin:0;padding-left:20px;color:#15803d;font-size:14px;line-height:1.8;">
<li>Track your repair status online in real time</li>
<li>View and pay invoices securely online</li>
<li>Book future services faster with saved details</li>
<li>Access your full service history</li>
</ul>
<p style="margin:12px 0 0;"><a href="${registerUrl(origin, email)}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-size:14px;">Create Your Free Account</a></p>
</div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const origin = await resolveOrigin(req, body, base44);
    const db = base44.asServiceRole.entities;

    let eventType = body.event_type;
    let jobId = body.job_id;
    let invoiceId = body.invoice_id;
    let userId = body.user_id;

    // Determine event from automation payload
    if (!eventType && body.event) {
      const { type, entity_name, entity_id } = body.event;
      if (entity_name === 'Job') {
        jobId = entity_id;
        if (type === 'create') eventType = 'booking_request';
        else if (type === 'update') {
          const newStatus = body.data?.status;
          const oldStatus = body.old_data?.status;
          if (newStatus === 'booked' && oldStatus !== 'booked') eventType = 'job_scheduled';
          else if (newStatus === 'repair_in_progress' && oldStatus !== 'repair_in_progress') eventType = 'repair_started';
          else if (newStatus === 'ready_for_pickup' && oldStatus !== 'ready_for_pickup') eventType = 'repair_completed';
        }
      } else if (entity_name === 'Invoice') {
        invoiceId = entity_id;
        if (type === 'update') {
          const newVis = body.data?.invoiceVisibility;
          const oldVis = body.old_data?.invoiceVisibility;
          const newStatus = body.data?.status;
          const oldStatus = body.old_data?.status;
          if (newVis === 'customer_visible' && oldVis !== 'customer_visible') eventType = 'invoice_issued';
          else if (newStatus === 'paid' && oldStatus !== 'paid') eventType = 'invoice_paid';
          else if (newStatus === 'failed' && oldStatus !== 'failed') eventType = 'payment_failed';
        }
      } else if (entity_name === 'User') {
        userId = entity_id;
        if (type === 'create') eventType = 'user_welcome';
      }
    }

    if (!eventType) return Response.json({ skipped: 'no event type determined' });

    const results = [];

    // ── USER WELCOME ──
    if (eventType === 'user_welcome') {
      const user = userId ? await db.User.get(userId).catch(() => null) : null;
      if (!user || !user.email) return Response.json({ skipped: 'user not found or no email' });
      const isStaff = STAFF_ROLES.has(String(user.role || '').toLowerCase());

      const key = `notif:user_welcome:${user.id}:email`;
      if (!await alreadySent(base44, key)) {
        const subject = `Welcome to ${BUSINESS_NAME}!`;
        const body = isStaff
          ? `<p>Hi ${user.full_name || 'there'},</p><p>Welcome to the ${BUSINESS_NAME} team! Your staff account has been created. You can access the dashboard to manage jobs, invoices, and customer bookings.</p><p style="margin-top:24px;"><a href="${dashboardUrl(origin)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Go to Dashboard</a></p>`
          : `<p>Hi ${user.full_name || 'there'},</p><p>Welcome to ${BUSINESS_NAME}! Your account has been created. You can now book repairs, track your jobs, and view invoices online.</p><p style="margin-top:24px;"><a href="${portalUrl(origin)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Go to My Portal</a></p>`;
        const sent = await sendEmail(user.email, subject, emailTemplate(body));
        if (sent) { await markSent(base44, key, `Welcome email sent to ${user.email}`); results.push({ channel: 'email', to: user.email, sent: true }); }
      }

      // Notify staff about new user
      const staffKey = `notif:user_welcome_staff:${user.id}:email`;
      if (!await alreadySent(base44, staffKey)) {
        const staff = await getStaffUsers(base44);
        const subject = `New user account created`;
        const body = `<p>A new user account has been created:</p><p><strong>${user.full_name || 'Unknown'}</strong><br>${user.email}</p><p style="margin-top:16px;"><a href="${dashboardUrl(origin)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View Dashboard</a></p>`;
        for (const s of staff) {
          if (s.id === user.id) continue;
          await sendEmail(s.email, subject, emailTemplate(body));
        }
        await markSent(base44, staffKey, `Staff notified of new user ${user.email}`);
        results.push({ channel: 'email', to: 'staff', sent: true });
      }
    }

    // ── BOOKING REQUEST ──
    if (eventType === 'booking_request') {
      const job = jobId ? await db.Job.get(jobId).catch(() => null) : null;
      if (!job) return Response.json({ skipped: 'job not found' });
      const customerName = job.customer_name || 'there';
      const customerEmail = job.customer_email || '';
      const customerPhone = job.customer_phone_e164 || '';
      const ref = job.reference || job.id;
      const isGuest = isGuestBooking(job);

      // Customer email
      if (customerEmail) {
        const key = `notif:booking_request:${job.id}:email`;
        if (!await alreadySent(base44, key)) {
          const subject = `Booking request received — ${ref}`;
          const trackButton = isGuest ? '' : `<p style="margin-top:24px;"><a href="${trackUrl(origin, job.id)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Track Your Repair</a></p>`;
          const body = `<p>Hi ${customerName},</p><p>We've received your booking request for your ${job.asset_label || 'scooter'}. Our team will review it and contact you shortly to confirm your appointment.</p><p><strong>Reference:</strong> ${ref}</p><p><strong>Issue:</strong> ${job.issue_description || 'Not specified'}</p>${trackButton}`;
          const sent = await sendEmail(customerEmail, subject, emailTemplate(body));
          if (sent) { await markSent(base44, key, `Booking confirmation email sent to ${customerEmail}`); results.push({ channel: 'email', to: customerEmail, sent: true }); }
        }
      }

      // Customer SMS
      if (customerPhone) {
        const key = `notif:booking_request:${job.id}:sms`;
        if (!await alreadySent(base44, key)) {
          const msg = isGuest
            ? `Hi ${customerName}, we received your booking request (ref ${ref}). Our team will confirm your appointment shortly.`
            : `Hi ${customerName}, we received your booking request (ref ${ref}). Our team will confirm your appointment shortly. Track: ${trackUrl(origin, job.id)}`;
          const sent = await sendSMS(customerPhone, msg);
          if (sent) { await markSent(base44, key, `Booking confirmation SMS sent to ${customerPhone}`); results.push({ channel: 'sms', to: customerPhone, sent: true }); }
        }
      }

      // Staff email notification
      const staffKey = `notif:booking_request_staff:${job.id}:email`;
      if (!await alreadySent(base44, staffKey)) {
        const staff = await getStaffUsers(base44);
        const subject = `New booking request — ${ref}`;
        const body = `<p>A new booking request has been submitted.</p><p><strong>Customer:</strong> ${customerName}<br><strong>Email:</strong> ${customerEmail || 'N/A'}<br><strong>Phone:</strong> ${job.customer_phone_display || customerPhone || 'N/A'}<br><strong>Scooter:</strong> ${job.asset_label || 'N/A'}<br><strong>Issue:</strong> ${job.issue_description || 'N/A'}</p><p style="margin-top:16px;"><a href="${dashboardUrl(origin)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View in Dashboard</a></p>`;
        for (const s of staff) await sendEmail(s.email, subject, emailTemplate(body));
        await markSent(base44, staffKey, `Staff notified of booking ${ref}`);
        results.push({ channel: 'email', to: 'staff', sent: true });
      }

      // Staff SMS notification
      const staffSmsKey = `notif:booking_request_staff:${job.id}:sms`;
      if (!await alreadySent(base44, staffSmsKey)) {
        const staff = await getStaffUsers(base44);
        const msg = `New booking request — ${ref}. ${customerName}, ${job.customer_phone_display || customerPhone || 'no phone'}. ${job.asset_label || 'Scooter'}: ${job.issue_description || 'N/A'}. ${dashboardUrl(origin)}`;
        let sentAny = false;
        for (const s of staff) {
          if (s.phone_e164) { await sendSMS(s.phone_e164, msg); sentAny = true; }
        }
        if (sentAny) { await markSent(base44, staffSmsKey, `Staff notified by SMS of booking ${ref}`); results.push({ channel: 'sms', to: 'staff', sent: true }); }
      }
    }

    // ── JOB SCHEDULED ──
    if (eventType === 'job_scheduled') {
      const job = jobId ? await db.Job.get(jobId).catch(() => null) : null;
      if (!job) return Response.json({ skipped: 'job not found' });
      const customerName = job.customer_name || 'there';
      const customerEmail = job.customer_email || '';
      const customerPhone = job.customer_phone_e164 || '';
      const ref = job.reference || job.id;
      const dateStr = fmtDate(job.scheduled_date);
      const timeWindow = job.preferred_time_window || '';
      const isGuest = isGuestBooking(job);

      if (customerEmail) {
        const key = `notif:job_scheduled:${job.id}:email`;
        if (!await alreadySent(base44, key)) {
          const subject = `Booking confirmed — ${ref}`;
          const footer = isGuest
            ? guestPerksBlock(origin, customerEmail)
            : `<p style="margin-top:24px;"><a href="${trackUrl(origin, job.id)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Track Your Repair</a></p>`;
          const body = `<p>Hi ${customerName},</p><p>Your repair booking has been confirmed. Please drop off your ${job.asset_label || 'scooter'} on:</p><p style="background:#e0f2fe;padding:16px;border-radius:8px;text-align:center;font-size:18px;font-weight:600;">${dateStr}${timeWindow ? `<br><span style="font-size:14px;font-weight:400;">${timeWindow}</span>` : ''}</p><p>We look forward to seeing you!</p>${footer}`;
          const sent = await sendEmail(customerEmail, subject, emailTemplate(body));
          if (sent) { await markSent(base44, key, `Scheduling confirmation email sent to ${customerEmail}`); results.push({ channel: 'email', to: customerEmail, sent: true }); }
        }
      }

      if (customerPhone) {
        const key = `notif:job_scheduled:${job.id}:sms`;
        if (!await alreadySent(base44, key)) {
          const msg = isGuest
            ? `Hi ${customerName}, your repair booking is confirmed. Drop off: ${dateStr}${timeWindow ? ', ' + timeWindow : ''}. Ref: ${ref}.`
            : `Hi ${customerName}, your repair booking is confirmed. Drop off: ${dateStr}${timeWindow ? ', ' + timeWindow : ''}. Ref: ${ref}. Track: ${trackUrl(origin, job.id)}`;
          const sent = await sendSMS(customerPhone, msg);
          if (sent) { await markSent(base44, key, `Scheduling confirmation SMS sent to ${customerPhone}`); results.push({ channel: 'sms', to: customerPhone, sent: true }); }
        }
      }
    }

    // ── REPAIR STARTED ──
    if (eventType === 'repair_started') {
      const job = jobId ? await db.Job.get(jobId).catch(() => null) : null;
      if (!job) return Response.json({ skipped: 'job not found' });
      const customerName = job.customer_name || 'there';
      const customerEmail = job.customer_email || '';
      const ref = job.reference || job.id;
      const isGuest = isGuestBooking(job);

      if (customerEmail) {
        const key = `notif:repair_started:${job.id}:email`;
        if (!await alreadySent(base44, key)) {
          const subject = `Repair started — ${ref}`;
          const trackButton = isGuest ? '' : `<p style="margin-top:24px;"><a href="${trackUrl(origin, job.id)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Track Your Repair</a></p>`;
          const body = `<p>Hi ${customerName},</p><p>Good news! We've started working on your ${job.asset_label || 'scooter'}. Our technicians are diagnosing and repairing the issue. We'll let you know as soon as it's ready for pickup.</p>${trackButton}`;
          const sent = await sendEmail(customerEmail, subject, emailTemplate(body));
          if (sent) { await markSent(base44, key, `Repair started email sent to ${customerEmail}`); results.push({ channel: 'email', to: customerEmail, sent: true }); }
        }
      }
    }

    // ── REPAIR COMPLETED / READY FOR PICKUP ──
    if (eventType === 'repair_completed') {
      const job = jobId ? await db.Job.get(jobId).catch(() => null) : null;
      if (!job) return Response.json({ skipped: 'job not found' });
      const customerName = job.customer_name || 'there';
      const customerEmail = job.customer_email || '';
      const customerPhone = job.customer_phone_e164 || '';
      const ref = job.reference || job.id;
      const isGuest = isGuestBooking(job);

      if (customerEmail) {
        const key = `notif:repair_completed:${job.id}:email`;
        if (!await alreadySent(base44, key)) {
          const subject = `Your scooter is ready for pickup — ${ref}`;
          const trackButton = isGuest ? '' : `<p style="margin-top:24px;"><a href="${trackUrl(origin, job.id)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Track Your Repair</a></p>`;
          const body = `<p>Hi ${customerName},</p><p>Great news! Your ${job.asset_label || 'scooter'} repair is complete and ready for pickup. Please come by during our opening hours to collect it.</p>${trackButton}`;
          const sent = await sendEmail(customerEmail, subject, emailTemplate(body));
          if (sent) { await markSent(base44, key, `Ready for pickup email sent to ${customerEmail}`); results.push({ channel: 'email', to: customerEmail, sent: true }); }
        }
      }

      if (customerPhone) {
        const key = `notif:repair_completed:${job.id}:sms`;
        if (!await alreadySent(base44, key)) {
          const msg = isGuest
            ? `Hi ${customerName}, your scooter is ready for pickup! Ref: ${ref}.`
            : `Hi ${customerName}, your scooter is ready for pickup! Ref: ${ref}. Track: ${trackUrl(origin, job.id)}`;
          const sent = await sendSMS(customerPhone, msg);
          if (sent) { await markSent(base44, key, `Ready for pickup SMS sent to ${customerPhone}`); results.push({ channel: 'sms', to: customerPhone, sent: true }); }
        }
      }
    }

    // ── INVOICE ISSUED ──
    if (eventType === 'invoice_issued') {
      const invoice = invoiceId ? await db.Invoice.get(invoiceId).catch(() => null) : null;
      if (!invoice) return Response.json({ skipped: 'invoice not found' });
      const job = invoice.job_id ? await db.Job.get(invoice.job_id).catch(() => null) : null;
      const customerName = job?.customer_name || 'there';
      const customerEmail = job?.customer_email || '';
      const ref = job?.reference || invoice.id;
      const amount = fmtMoney(invoice.amount, invoice.currency);

      if (customerEmail) {
        const key = `notif:invoice_issued:${invoice.id}:email`;
        if (!await alreadySent(base44, key)) {
          const subject = `Invoice ${invoice.number || ''} — ${amount}`;
          const body = `<p>Hi ${customerName},</p><p>Your invoice is ready. Please review and pay online at your convenience.</p><p style="background:#e0f2fe;padding:16px;border-radius:8px;text-align:center;"><strong>Invoice:</strong> ${invoice.number || 'N/A'}<br><strong>Amount:</strong> ${amount}</p><p style="margin-top:24px;"><a href="${portalUrl(origin)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View & Pay Invoice</a></p>`;
          const sent = await sendEmail(customerEmail, subject, emailTemplate(body));
          if (sent) { await markSent(base44, key, `Invoice issued email sent to ${customerEmail}`); results.push({ channel: 'email', to: customerEmail, sent: true }); }
        }
      }
    }

    // ── INVOICE PAID ──
    if (eventType === 'invoice_paid') {
      const invoice = invoiceId ? await db.Invoice.get(invoiceId).catch(() => null) : null;
      if (!invoice) return Response.json({ skipped: 'invoice not found' });
      const job = invoice.job_id ? await db.Job.get(invoice.job_id).catch(() => null) : null;
      const customerName = job?.customer_name || 'there';
      const customerEmail = job?.customer_email || '';
      const customerPhone = job?.customer_phone_e164 || '';
      const ref = job?.reference || invoice.id;
      const amount = fmtMoney(invoice.amount, invoice.currency);

      // Customer email
      if (customerEmail) {
        const key = `notif:invoice_paid:${invoice.id}:email`;
        if (!await alreadySent(base44, key)) {
          const subject = `Payment confirmed — ${ref}`;
          const body = `<p>Hi ${customerName},</p><p>We've received your payment of <strong>${amount}</strong> for invoice ${invoice.number || ''}. Thank you!</p><p>We'd love to hear your feedback. How did we do?</p><p style="margin-top:24px;"><a href="${feedbackUrl(origin, job?.id)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Leave Feedback</a></p><div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:20px;"><p style="margin:0 0 8px;font-weight:600;color:#92400e;">⭐ Leave a Google Review & Get 5% Off Your Next Repair!</p><p style="margin:0 0 12px;color:#78350f;font-size:14px;">Share your experience on Google and we'll send you a 5% discount code for your next repair. It only takes a minute!</p><a href="https://g.page/r/CYIYxtmlUJakEBI/review" style="background:#4285f4;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-size:14px;">Review Us on Google</a></div>`;
          const sent = await sendEmail(customerEmail, subject, emailTemplate(body));
          if (sent) { await markSent(base44, key, `Payment confirmation email sent to ${customerEmail}`); results.push({ channel: 'email', to: customerEmail, sent: true }); }
        }
      }

      // Customer SMS
      if (customerPhone) {
        const key = `notif:invoice_paid:${invoice.id}:sms`;
        if (!await alreadySent(base44, key)) {
          const msg = `Hi ${customerName}, payment received for invoice ${invoice.number || ''} (${amount}). Thank you! Ref: ${ref}`;
          const sent = await sendSMS(customerPhone, msg);
          if (sent) { await markSent(base44, key, `Payment confirmation SMS sent to ${customerPhone}`); results.push({ channel: 'sms', to: customerPhone, sent: true }); }
        }
      }

      // Staff notification
      const staffKey = `notif:invoice_paid_staff:${invoice.id}:email`;
      if (!await alreadySent(base44, staffKey)) {
        const staff = await getStaffUsers(base44);
        const subject = `Payment received — ${ref}`;
        const body = `<p>Payment of <strong>${amount}</strong> has been received for invoice ${invoice.number || ''} from ${customerName}.</p><p style="margin-top:16px;"><a href="${dashboardUrl(origin)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View Dashboard</a></p>`;
        for (const s of staff) await sendEmail(s.email, subject, emailTemplate(body));
        await markSent(base44, staffKey, `Staff notified of payment for ${ref}`);
        results.push({ channel: 'email', to: 'staff', sent: true });
      }
    }

    // ── PAYMENT FAILED ──
    if (eventType === 'payment_failed') {
      const invoice = invoiceId ? await db.Invoice.get(invoiceId).catch(() => null) : null;
      if (!invoice) return Response.json({ skipped: 'invoice not found' });
      const job = invoice.job_id ? await db.Job.get(invoice.job_id).catch(() => null) : null;
      const customerName = job?.customer_name || 'there';
      const customerEmail = job?.customer_email || '';
      const ref = job?.reference || invoice.id;
      const amount = fmtMoney(invoice.amount, invoice.currency);

      // Customer email
      if (customerEmail) {
        const key = `notif:payment_failed:${invoice.id}:email`;
        if (!await alreadySent(base44, key)) {
          const subject = `Payment failed — Invoice ${invoice.number || ''}`;
          const body = `<p>Hi ${customerName},</p><p>Your payment of <strong>${amount}</strong> for invoice ${invoice.number || ''} was unsuccessful. Please try again or contact us if you need assistance.</p><p style="margin-top:24px;"><a href="${portalUrl(origin)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Try Again</a></p>`;
          const sent = await sendEmail(customerEmail, subject, emailTemplate(body));
          if (sent) { await markSent(base44, key, `Payment failed email sent to ${customerEmail}`); results.push({ channel: 'email', to: customerEmail, sent: true }); }
        }
      }

      // Staff notification
      const staffKey = `notif:payment_failed_staff:${invoice.id}:email`;
      if (!await alreadySent(base44, staffKey)) {
        const staff = await getStaffUsers(base44);
        const subject = `Payment failed — ${ref}`;
        const body = `<p>A payment attempt for invoice ${invoice.number || ''} (${amount}) from ${customerName} has failed.</p><p style="margin-top:16px;"><a href="${dashboardUrl(origin)}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View Dashboard</a></p>`;
        for (const s of staff) await sendEmail(s.email, subject, emailTemplate(body));
        await markSent(base44, staffKey, `Staff notified of failed payment for ${ref}`);
        results.push({ channel: 'email', to: 'staff', sent: true });
      }
    }

    return Response.json({ event_type: eventType, results });
  } catch (error) {
    console.error('[sendNotification] failed:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});