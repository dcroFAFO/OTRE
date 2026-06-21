import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';

const DEFAULT_PERMISSIONS = ['view_status', 'view_booking', 'add_note', 'upload_file'];
const STAFF_ROLES = new Set(['admin', 'employee', 'technician']);
const encoder = new TextEncoder();

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function makeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function originFrom(req) {
  const origin = req.headers.get('origin');
  if (origin) return origin;
  const referer = req.headers.get('referer');
  if (referer) return new URL(referer).origin;
  return 'https://app.base44.com';
}

function hasPermission(access, permission) {
  return (access.permissions || []).includes(permission);
}

async function getValidAccess(base44, jobIdentifier, rawToken) {
  const trackingToken = rawToken || jobIdentifier;
  if (!trackingToken) return { error: 'Tracking link is missing required information.', status: 400 };

  let job = null;
  if (rawToken && jobIdentifier) {
    job = await base44.asServiceRole.entities.Job.get(jobIdentifier).catch(() => null);
  }
  if (!job) {
    const jobs = await base44.asServiceRole.entities.Job.filter({ tracking_token: trackingToken }, '-created_date', 1);
    job = jobs[0] || null;
  }
  if (!job) return { error: 'This tracking link is not valid. Please check the link or contact On The Run Electrics for help.', status: 403 };

  const tokenHash = await sha256(trackingToken);
  const records = await base44.asServiceRole.entities.PublicJobAccess.filter({ jobId: job.id, tokenHash }, '-created_date', 1);
  const access = records[0] || null;
  if (!access) return { error: 'This tracking link is not valid. Please check the link or contact On The Run Electrics for help.', status: 403 };
  if (access.revokedAt || access.revoked_at) return { error: 'This tracking link has been revoked.', status: 403 };
  const expires = access.expiresAt || access.expires_at;
  if (expires && new Date(expires).getTime() < Date.now()) return { error: 'This tracking link has expired.', status: 403 };
  return { access, job, trackingToken };
}

function publicJob(job) {
  return {
    id: job.id,
    reference: job.reference,
    status: job.status,
    source: job.source || 'staff_created',
    customer_name: job.customer_name,
    asset_label: job.asset_label,
    scooterDetails: job.scooterDetails || job.scooter_details || job.asset_label || '',
    issueDescription: job.issueDescription || job.issue_description || '',
    issue_description: job.issue_description || '',
    scheduled_date: job.scheduled_date || null,
    preferred_time_window: job.preferred_time_window || null,
    createdAt: job.createdAt || job.created_date,
    updatedAt: job.updatedAt || job.updated_date,
  };
}

function publicQuote(quote) {
  if (!quote || !['sent', 'approved', 'rejected'].includes(quote.status)) return null;
  return {
    id: quote.id,
    status: quote.status,
    approval_status: quote.approval_status,
    diagnosis_notes: quote.diagnosis_notes,
    recommended_repair: quote.recommended_repair,
    total: quote.total,
    currency: quote.currency || 'AUD',
    line_items: quote.line_items || [],
    sent_date: quote.sent_date || null,
  };
}

function publicInvoice(invoice) {
  if (!invoice || invoice.invoiceVisibility !== 'customer_visible') return null;
  return {
    id: invoice.id,
    number: invoice.number,
    amount: invoice.amount,
    currency: invoice.currency || 'AUD',
    status: invoice.status,
    line_items: (invoice.line_items || []).map((item) => ({
      description: item.description || 'Line item',
      qty: Number(item.qty) || 1,
      unit_price: Number(item.unit_price) || 0,
      tax_rate: Number(item.tax_rate) || 0,
      discount_amount: Number(item.discount_amount) || 0,
      kind: item.kind || 'item',
    })),
    paid_date: invoice.paid_date || null,
    payment_status: invoice.status,
  };
}

async function buildPayload(base44, job, access) {
  const [quotes, invoices, notes, attachments] = await Promise.all([
    base44.asServiceRole.entities.Quote.filter({ job_id: job.id }, '-created_date', 1),
    base44.asServiceRole.entities.Invoice.filter({ job_id: job.id }, '-created_date', 1),
    base44.asServiceRole.entities.JobNote.filter({ job_id: job.id, visibility: 'customer' }, '-created_date', 100),
    base44.asServiceRole.entities.Attachment.filter({ job_id: job.id, visibility: 'customer' }, '-created_date', 50),
  ]);

  return {
    job: publicJob(job),
    quote: hasPermission(access, 'view_quote') || hasPermission(access, 'quote') ? publicQuote(quotes[0]) : null,
    invoice: hasPermission(access, 'view_invoice') || hasPermission(access, 'invoice') ? publicInvoice(invoices[0]) : null,
    notes: notes.map((n) => ({ id: n.id, body: n.body, author_name: n.author_name, created_date: n.created_date })),
    attachments: attachments.map((a) => ({ id: a.id, file_url: a.file_url, file_name: a.file_name, kind: a.kind, created_date: a.created_date })),
    permissions: access.permissions || [],
  };
}

async function requireStaff(base44) {
  const user = await base44.auth.me();
  if (!user || !STAFF_ROLES.has(user.role)) return { error: 'Forbidden', status: 403 };
  return { user };
}

Deno.serve(async (req) => {
  const meta = { fn: 'publicJobAccessActions' };
  try {
    const base44 = createClientFromRequest(req);
    const { action, jobId, trackingToken, token, permissions, note, file_url, file_name, kind, quoteId, approved, invoiceId } = await req.json().catch(() => ({}));
    meta.action = action;
    meta.jobId = jobId;

    if (!action) return Response.json({ error: 'action is required' }, { status: 400 });

    if (action === 'staff_generate') {
      const staff = await requireStaff(base44);
      if (staff.error) return Response.json({ error: staff.error }, { status: staff.status });
      const job = await base44.asServiceRole.entities.Job.get(jobId).catch(() => null);
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

      const now = new Date().toISOString();
      const existing = await base44.asServiceRole.entities.PublicJobAccess.filter({ jobId });
      await Promise.all(existing.filter((a) => !a.revokedAt && !a.revoked_at).map((a) => base44.asServiceRole.entities.PublicJobAccess.update(a.id, { revokedAt: now, revoked_at: now })));

      const rawToken = makeToken();
      const tokenHash = await sha256(rawToken);
      const accessPermissions = permissions?.length ? permissions : [...DEFAULT_PERMISSIONS, 'view_quote', 'view_invoice', 'pay_invoice'];
      await base44.asServiceRole.entities.Job.update(jobId, { tracking_token: rawToken, updatedAt: now });
      await base44.asServiceRole.entities.PublicJobAccess.create({
        jobId,
        job_id: jobId,
        tokenHash,
        token_hash: tokenHash,
        permissions: accessPermissions,
        createdAt: now,
      });
      const trackingLink = `${originFrom(req)}/track/${encodeURIComponent(rawToken)}`;
      return Response.json({ trackingLink, permissions: accessPermissions });
    }

    if (action === 'staff_revoke') {
      const staff = await requireStaff(base44);
      if (staff.error) return Response.json({ error: staff.error }, { status: staff.status });
      const now = new Date().toISOString();
      const existing = await base44.asServiceRole.entities.PublicJobAccess.filter({ jobId });
      await Promise.all(existing.filter((a) => !a.revokedAt && !a.revoked_at).map((a) => base44.asServiceRole.entities.PublicJobAccess.update(a.id, { revokedAt: now, revoked_at: now })));
      return Response.json({ revoked: existing.length });
    }

    const accessResult = await getValidAccess(base44, trackingToken || jobId, token);
    if (accessResult.error) return Response.json({ error: accessResult.error }, { status: accessResult.status });
    const access = accessResult.access;
    const job = accessResult.job;

    if (action === 'get') {
      return Response.json(await buildPayload(base44, job, access));
    }

    if (action === 'add_note') {
      if (!hasPermission(access, 'add_note')) return Response.json({ error: 'This link cannot add notes.' }, { status: 403 });
      if (!note?.trim()) return Response.json({ error: 'Note is required.' }, { status: 400 });
      await base44.asServiceRole.entities.JobNote.create({
        job_id: job.id,
        customer_id: job.customer_id || null,
        body: note.trim(),
        visibility: 'customer',
        author_name: job.customer_name || 'Customer',
        author_role: 'customer',
      });
      return Response.json(await buildPayload(base44, job, access));
    }

    if (action === 'upload_file') {
      if (!hasPermission(access, 'upload_file')) return Response.json({ error: 'This link cannot upload files.' }, { status: 403 });
      if (!file_url) return Response.json({ error: 'file_url is required.' }, { status: 400 });
      await base44.asServiceRole.entities.Attachment.create({
        job_id: job.id,
        customer_id: job.customer_id || null,
        file_url,
        file_name: file_name || 'Customer upload',
        kind: kind || 'document',
        visibility: 'customer',
        uploaded_by_name: job.customer_name || 'Customer',
      });
      return Response.json(await buildPayload(base44, job, access));
    }

    if (action === 'quote_decision') {
      if (!hasPermission(access, 'quote_decision')) return Response.json({ error: 'This link cannot approve or reject quotes.' }, { status: 403 });
      const quotes = await base44.asServiceRole.entities.Quote.filter({ job_id: job.id }, '-created_date', 1);
      const quote = quotes[0];
      if (!quote || quote.id !== quoteId) return Response.json({ error: 'Quote not found.' }, { status: 404 });
      const ok = !!approved;
      await base44.asServiceRole.entities.Quote.update(quote.id, { status: ok ? 'approved' : 'rejected', approval_status: ok ? 'approved' : 'rejected' });
      await base44.asServiceRole.entities.Job.update(job.id, { quote_status: ok ? 'approved' : 'rejected', status: ok ? 'quote_approved' : job.status });
      await base44.asServiceRole.entities.AuditEvent.create({
        event_type: ok ? 'quote_approved' : 'quote_rejected',
        job_id: job.id,
        customer_id: job.customer_id || null,
        actor_name: job.customer_name || 'Customer',
        actor_role: 'customer',
        summary: ok ? 'Quote approved from public tracking link' : 'Quote rejected from public tracking link',
        visibility: 'customer',
      });
      const freshJob = await base44.asServiceRole.entities.Job.get(job.id);
      return Response.json(await buildPayload(base44, freshJob, access));
    }

    if (action === 'start_payment') {
      if (!hasPermission(access, 'pay_invoice')) return Response.json({ error: 'This link cannot pay invoices.' }, { status: 403 });
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeKey) return Response.json({ error: 'Stripe is not configured.' }, { status: 500 });
      const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
      if (!invoice || invoice.job_id !== job.id || invoice.invoiceVisibility !== 'customer_visible') return Response.json({ error: 'Invoice not found.' }, { status: 404 });
      const amount = Math.round((Number(invoice.amount) || 0) * 100);
      if (amount <= 0) return Response.json({ error: 'Invoice amount must be greater than zero.' }, { status: 400 });
      const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
      const origin = originFrom(req);
      const metadata = { base44_app_id: Deno.env.get('BASE44_APP_ID') || '', invoice_id: invoice.id, job_id: job.id, customer_id: job.customer_id || '' };
      const returnUrl = `${origin}/track/${encodeURIComponent(accessResult.trackingToken)}`;
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: job.customer_email || undefined,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: String(invoice.currency || 'AUD').toLowerCase(),
            unit_amount: amount,
            product_data: { name: invoice.number ? `Invoice ${invoice.number}` : 'Invoice payment', description: job.reference ? `Job ${job.reference}` : 'Repair invoice payment' },
          },
        }],
        success_url: `${returnUrl}&payment=success`,
        cancel_url: `${returnUrl}&payment=cancelled`,
        metadata,
        payment_intent_data: { metadata },
      });
      await base44.asServiceRole.entities.Invoice.update(invoice.id, { payment_provider: 'stripe', payment_intent_ref: session.id });
      return Response.json({ url: session.url });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[publicJobAccessActions] failed', JSON.stringify({ ...meta, message: error.message, stack: error.stack }));
    return Response.json({ error: error.message || 'Public job access failed.' }, { status: 500 });
  }
});