import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { checkRateLimit, clientIp } from '../../shared/rateLimit.ts';

const ACTIVE_STATUSES_EXCLUDED = new Set(['completed', 'cancelled']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SENDS_PER_IP = 8;

function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return `+61${cleaned.replace(/\D/g, '')}`;
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function createCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sendSms({ to, body }) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!accountSid || !authToken || !from) throw new Error('SMS verification is not configured.');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio SMS failed: ${await res.text()}`);
}

async function sendEmail({ to, subject, body, fromEmail, businessName }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('Email verification is not configured.');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${businessName} <${fromEmail}>`, to: [to], subject, html: body }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${await res.text()}`);
}

async function getBusinessContact(entities) {
  const profiles = await entities.BusinessProfile.filter({ is_default: true }, '-updated_date', 1).catch(() => []);
  const profile = profiles[0] || (await entities.BusinessProfile.list('-updated_date', 1).catch(() => []))[0] || {};
  const candidateEmail = String(profile.invoice_sender_email || profile.email || '').trim().toLowerCase();
  return {
    businessName: String(profile.business_name || profile.name || 'On The Run Electrics').replace(/[<>\r\n]/g, '').trim() || 'On The Run Electrics',
    fromEmail: /^[^\s@]+@ontherunelectrics\.com\.au$/i.test(candidateEmail) ? candidateEmail : 'info@ontherunelectrics.com.au',
  };
}

async function handleSend(base44, req, body) {
  const entities = base44.asServiceRole.entities;
  const name = String(body.name || '').trim();
  const email = cleanEmail(body.email);
  const phone = normalizePhone(body.phone);
  const channel = body.channel === 'email' ? 'email' : 'sms';

  if (!/^\+614\d{8}$/.test(phone)) return Response.json({ error: 'A valid Australian mobile number is required.' }, { status: 400 });
  if (!EMAIL_PATTERN.test(email)) return Response.json({ error: 'A valid email address is required.' }, { status: 400 });

  const ipLimit = await checkRateLimit(base44, `booking-verification:ip:${clientIp(req)}`, MAX_SENDS_PER_IP);
  if (!ipLimit.allowed) return Response.json({ error: 'Too many verification codes were requested. Please wait a few minutes and try again.' }, { status: 429 });

  const recent = await entities.PhoneVerification.filter({ phone_e164: phone, purpose: 'booking' }, '-created_date', 5);
  const oneMinuteAgo = Date.now() - 60 * 1000;
  const justSent = recent.some((record) => !record.consumed_at && new Date(record.created_date).getTime() > oneMinuteAgo);
  if (justSent) return Response.json({ error: 'Please wait a minute before requesting another code.' }, { status: 429 });

  const code = createCode();
  const codeHash = await sha256(`${phone}:${email}:${code}`);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await entities.PhoneVerification.create({ phone_e164: phone, email, purpose: 'booking', code_hash: codeHash, expires_at: expiresAt, attempts: 0, delivery_channel: channel });

  if (channel === 'email') {
    const contact = await getBusinessContact(entities);
    await sendEmail({
      to: email,
      subject: 'Your verification code — On The Run Electrics',
      body: `<p>Hi ${escapeHtml(name || 'there')},</p><p>Your verification code is <strong style="font-size:20px;">${code}</strong>. It expires in 10 minutes.</p>`,
      ...contact,
    });
  } else {
    await sendSms({ to: phone, body: `Your On The Run Electrics verification code is ${code}. It expires in 10 minutes.` });
  }

  return Response.json({ sent: true, channel });
}

async function findActiveJobsForCustomer(entities, customer) {
  const stableId = customer.customer_id || customer.id;
  const [byStable, byAccount] = await Promise.all([
    entities.Job.filter({ customer_id: stableId }, '-created_date', 50).catch(() => []),
    entities.Job.filter({ customer_account_id: customer.id }, '-created_date', 50).catch(() => []),
  ]);
  const jobs = [...new Map([...byStable, ...byAccount].map((j) => [j.id, j])).values()];
  return jobs
    .filter((job) => !ACTIVE_STATUSES_EXCLUDED.has(String(job.status || '').toLowerCase()))
    .map((job) => ({
      id: job.id,
      reference: job.reference || '',
      status: job.status || '',
      asset_label: job.asset_label || job.scooter_make_model || job.scooterDetails || '',
      service_type: job.service_type || job.service_category_key || '',
      issue_description: job.issue_description || job.issueDescription || '',
    }));
}

async function findExistingCustomer(entities, email, phone) {
  if (!email || !phone) return null;
  const byEmail = await entities.Customer.filter({ email }, '-updated_date', 10).catch(() => []);
  return byEmail.find((customer) => normalizePhone(customer.phone_e164 || customer.phone || customer.phone_display) === phone) || null;
}

async function handleVerify(entities, body) {
  const email = cleanEmail(body.email);
  const phone = normalizePhone(body.phone);
  const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);

  if (!EMAIL_PATTERN.test(email) || !/^\+614\d{8}$/.test(phone)) return Response.json({ error: 'Enter the same valid email and mobile used to request the code.' }, { status: 400 });
  if (code.length !== 6) return Response.json({ error: 'Enter the 6-digit code.' }, { status: 400 });

  const records = await entities.PhoneVerification.filter({ phone_e164: phone, purpose: 'booking' }, '-created_date', 10);
  const now = Date.now();
  const record = records.find((item) => !item.consumed_at && new Date(item.expires_at).getTime() > now);
  if (!record) return Response.json({ error: 'That code has expired. Please request a new code.' }, { status: 400 });
  if ((record.attempts || 0) >= 5) return Response.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });

  const codeHash = await sha256(`${phone}:${email}:${code}`);
  if (codeHash !== record.code_hash) {
    await entities.PhoneVerification.update(record.id, { attempts: (record.attempts || 0) + 1 });
    return Response.json({ error: 'Invalid code. Please try again.' }, { status: 400 });
  }

  await entities.PhoneVerification.update(record.id, { consumed_at: new Date().toISOString(), attempts: (record.attempts || 0) + 1 });

  const existingCustomer = await findExistingCustomer(entities, email, phone);
  let activeJobs = [];
  if (existingCustomer) activeJobs = await findActiveJobsForCustomer(entities, existingCustomer);

  return Response.json({
    verified: true,
    verification_id: record.id,
    verified_at: new Date().toISOString(),
    existing: !!existingCustomer,
    customer_name: existingCustomer?.full_name || existingCustomer?.name || '',
    active_jobs: activeJobs,
    active_job: activeJobs[0] || null,
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const entities = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));

    if (body.action === 'send') return await handleSend(base44, req, body);
    if (body.action === 'verify') return await handleVerify(entities, body);
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('bookingVerification error:', error);
    return Response.json({ error: 'We could not complete verification just now. Please try again.' }, { status: 500 });
  }
});
