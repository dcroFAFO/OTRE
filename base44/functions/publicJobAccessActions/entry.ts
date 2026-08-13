import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { resolveTrustedOrigin, isTrustedFileUrl } from '../../shared/origin.ts';
import { lockAppliedReward, settleInvoiceRewards } from '../../shared/rewardLifecycle.ts';

const DEFAULT_PERMISSIONS = ['view_status', 'view_booking', 'add_note', 'upload_file'];
const STAFF_ROLES = new Set(['admin', 'employee', 'technician']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']);
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

function hasPermission(access, permission) {
  return (access.permissions || []).includes(permission);
}

const INVALID_LINK = 'This tracking link is not valid. Please check the link or contact On The Run Electrics for help.';

// Resolves a raw public token to its job using ONLY the stored SHA-256 hash. The
// raw token is never persisted, so it cannot be recovered by reading any record.
async function getValidAccess(base44, jobIdentifier, rawToken) {
  const trackingToken = rawToken || jobIdentifier;
  if (!trackingToken) return { error: 'Tracking link is missing required information.', status: 400 };

  const tokenHash = await sha256(trackingToken);
  const records = await base44.asServiceRole.entities.PublicJobAccess.filter({ tokenHash }, '-created_date', 1);
  const access = records[0] || null;
  if (!access) return { error: INVALID_LINK, status: 403 };

  const job = await base44.asServiceRole.entities.Job.get(access.jobId || access.job_id).catch(() => null);
  if (!job) return { error: INVALID_LINK, status: 403 };
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
  const [invoices, notes, attachments] = await Promise.all([
    base44.asServiceRole.entities.Invoice.filter({ job_id: job.id }, '-created_date', 1),
    base44.asServiceRole.entities.JobNote.filter({ job_id: job.id, visibility: 'customer' }, '-created_date', 100),
    base44.asServiceRole.entities.Attachment.filter({ job_id: job.id, visibility: 'customer' }, '-created_date', 50),
  ]);

  return {
    job: publicJob(job),
    invoice: hasPermission(access, 'view_invoice') || hasPermission(access, 'invoice') ? publicInvoice(invoices[0]) : null,
    notes: notes.map((n) => ({ id: n.id, body: n.body, author_name: n.author_name, created_date: n.created_date })),
    attachments: attachments.map((a) => ({ id: a.id, file_url: a.file_url, file_name: a.file_name, file_size: a.file_size, mime_type: a.mime_type, kind: a.kind, created_date: a.created_date })),
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
    const { action, jobId, trackingToken, token, permissions, note, file_url, file_name, file_size, mime_type, kind, invoiceId, checkoutAttemptId, sessionId } = await req.json().catch(() => ({}));
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
      const accessPermissions = permissions?.length ? permissions : [...DEFAULT_PERMISSIONS, 'view_invoice', 'pay_invoice'];
      // Only the hash is persisted; the raw token is returned once, below.
      await base44.asServiceRole.entities.PublicJobAccess.create({
        jobId,
        job_id: jobId,
        tokenHash,
        token_hash: tokenHash,
        permissions: accessPermissions,
        createdAt: now,
      });
      const trackingLink = `${await resolveTrustedOrigin(req, base44)}/track/${encodeURIComponent(rawToken)}`;
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

    if (action === 'verify_payment') {
      if (!hasPermission(access, 'pay_invoice')) return Response.json({ error: 'This link cannot verify invoice payments.' }, { status: 403 });
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeKey) return Response.json({ error: 'Payment verification is temporarily unavailable.' }, { status: 503 });
      if (!sessionId || !invoiceId) return Response.json({ error: 'Payment session details are required.' }, { status: 400 });
      const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
      const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
      const metadata = session?.metadata || {};
      if (!session || metadata.invoice_id !== invoiceId || metadata.job_id !== job.id || metadata.checkout_attempt_id !== checkoutAttemptId) {
        return Response.json({ error: 'Payment session does not match this tracking link.' }, { status: 403 });
      }
      const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
      if (!invoice || invoice.job_id !== job.id || invoice.invoiceVisibility !== 'customer_visible') {
        return Response.json({ error: 'Invoice not found.' }, { status: 404 });
      }
      if (session.payment_status === 'paid' && invoice.status !== 'paid') {
        const paidDate = new Date().toISOString();
        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          status: 'paid',
          paid_date: paidDate,
          payment_provider: 'stripe',
          stripe_checkout_session_id: session.id,
          payment_intent_ref: String(session.payment_intent || session.id),
          payment_method: 'card',
        });
        await base44.asServiceRole.entities.Job.update(job.id, { payment_status: 'paid', status: 'completed' });
        await base44.asServiceRole.entities.AuditEvent.create({
          event_type: 'payment_received',
          job_id: job.id,
          customer_id: invoice.customer_id || job.customer_id || '',
          actor_id: 'stripe',
          actor_name: 'Stripe',
          actor_role: 'system',
          previous_value: invoice.status || '',
          new_value: 'paid',
          summary: `Stripe payment verified for ${invoice.currency || 'AUD'} ${Number(invoice.amount || 0).toFixed(2)}`,
          visibility: 'customer',
        });
      }
      if (session.payment_status === 'paid') {
        const paidAt = invoice.paid_date || new Date().toISOString();
        await settleInvoiceRewards(base44.asServiceRole.entities, { ...invoice, status: 'paid', paid_date: paidAt }, job, paidAt);
      }
      const payload = await buildPayload(base44, job, access);
      return Response.json({
        ...payload,
        payment_result: {
          status: session.payment_status === 'paid' ? 'paid' : (session.status === 'expired' ? 'expired' : 'pending'),
          reference: invoice.number || '',
        },
      });
    }

    if (action === 'add_note') {
      if (!hasPermission(access, 'add_note')) return Response.json({ error: 'This link cannot add notes.' }, { status: 403 });
      if (!note?.trim()) return Response.json({ error: 'Note is required.' }, { status: 400 });
      if (note.trim().length > 2000) return Response.json({ error: 'Messages must be 2000 characters or fewer.' }, { status: 400 });
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
      if (!ALLOWED_UPLOAD_TYPES.has(String(mime_type || '').toLowerCase())) return Response.json({ error: 'Choose a JPG, PNG, WebP, HEIC, or PDF file.' }, { status: 400 });
      if (!Number.isFinite(Number(file_size)) || Number(file_size) <= 0 || Number(file_size) > MAX_UPLOAD_BYTES) return Response.json({ error: 'Choose a file smaller than 10 MB.' }, { status: 400 });
      if (!isTrustedFileUrl(file_url)) {
        console.warn('[publicJobAccessActions] rejected untrusted file url');
        return Response.json({ error: 'That file could not be accepted. Please upload the file again.' }, { status: 400 });
      }
      await base44.asServiceRole.entities.Attachment.create({
        job_id: job.id,
        customer_id: job.customer_id || null,
        file_url,
        file_name: String(file_name || 'Customer upload').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180),
        file_size: Number(file_size),
        mime_type: String(mime_type).toLowerCase(),
        kind: kind || 'document',
        visibility: 'customer',
        uploaded_by_name: job.customer_name || 'Customer',
      });
      return Response.json(await buildPayload(base44, job, access));
    }

    if (action === 'start_payment') {
      if (!hasPermission(access, 'pay_invoice')) return Response.json({ error: 'This link cannot pay invoices.' }, { status: 403 });
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeKey) return Response.json({ error: 'Payment is temporarily unavailable.' }, { status: 503 });
      let invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
      if (!invoice || invoice.job_id !== job.id || invoice.invoiceVisibility !== 'customer_visible') return Response.json({ error: 'Invoice not found.' }, { status: 404 });
      if (['paid', 'refunded', 'cancelled', 'void'].includes(invoice.status)) return Response.json({ error: 'This invoice cannot be paid online.' }, { status: 400 });
      if (typeof checkoutAttemptId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(checkoutAttemptId)) {
        return Response.json({ error: 'A valid checkout attempt is required.' }, { status: 400 });
      }
      try {
        invoice = await lockAppliedReward(base44.asServiceRole.entities, invoice);
      } catch (error) {
        return Response.json({ error: error.message || 'The selected reward is no longer available.' }, { status: 409 });
      }
      const amount = Math.round((Number(invoice.amount) || 0) * 100);
      if (amount <= 0) return Response.json({ error: 'Invoice amount must be greater than zero.' }, { status: 400 });
      const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
      // Must be an allowlisted origin — a spoofed Origin header here would redirect
      // the paying customer off-site with the tracking token in the URL.
      const origin = await resolveTrustedOrigin(req, base44);
      const metadata = { base44_app_id: Deno.env.get('BASE44_APP_ID') || '', payment_flow: 'invoice_payment', invoice_id: invoice.id, job_id: job.id, customer_id: job.customer_id || '', checkout_attempt_id: checkoutAttemptId };
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
        success_url: `${returnUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}&invoice=${encodeURIComponent(invoice.id)}&attempt=${encodeURIComponent(checkoutAttemptId)}`,
        cancel_url: `${returnUrl}?payment=cancelled&invoice=${encodeURIComponent(invoice.id)}&attempt=${encodeURIComponent(checkoutAttemptId)}`,
        metadata,
        payment_intent_data: { metadata },
      }, { idempotencyKey: `public-invoice:${Deno.env.get('BASE44_APP_ID') || 'app'}:${invoice.id}:${checkoutAttemptId}` });
      await base44.asServiceRole.entities.Invoice.update(invoice.id, {
        payment_provider: 'stripe',
        checkout_attempt_id: checkoutAttemptId,
        stripe_checkout_session_id: session.id,
        checkout_started_at: new Date().toISOString(),
      });
      return Response.json({ url: session.url, checkoutAttemptId });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[publicJobAccessActions] failed', JSON.stringify({ ...meta, message: error.message, stack: error.stack }));
    return Response.json({ error: 'This tracking request could not be completed. Please try again.' }, { status: 500 });
  }
});
