import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { resolveTrustedOrigin } from '../../shared/origin.ts';
import { lockAppliedReward } from '../../shared/rewardLifecycle.ts';

const blockingStatuses = new Set(['paid', 'refunded', 'cancelled', 'void']);
const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);

function validAttemptId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value);
}

function cleanReturnPath(value, isStaff) {
  const fallback = isStaff ? '/dashboard/invoices' : '/portal';
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  const path = value.split('#')[0];
  const allowed = isStaff
    ? ['/dashboard', '/admin', '/settings', '/assets']
    : ['/portal'];
  return allowed.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) ? path : fallback;
}

function appendResult(path, result, invoiceId, checkoutAttemptId, includeSession = false) {
  const separator = path.includes('?') ? '&' : '?';
  const session = includeSession ? '&session_id={CHECKOUT_SESSION_ID}' : '';
  return `${path}${separator}checkout_result=${result}${session}&invoice=${encodeURIComponent(invoiceId)}&attempt=${encodeURIComponent(checkoutAttemptId)}`;
}

function canAccessInvoice(user, invoice, job) {
  if (STAFF_ROLES.has(user.role) || user.is_customer === false || user.data?.is_customer === false) return true;
  const customerIds = new Set([
    user.id,
    user.customer_id,
    user.data?.customer_id,
  ].filter(Boolean));
  if (invoice.customer_id && customerIds.has(invoice.customer_id)) return true;
  if (job?.customer_user_id && job.customer_user_id === user.id) return true;
  const userEmail = String(user.email || '').trim().toLowerCase();
  const customerEmail = String(job?.customer_email || '').trim().toLowerCase();
  return !!userEmail && !!customerEmail && userEmail === customerEmail;
}

Deno.serve(async (req) => {
  const meta = { fn: 'createInvoiceCheckout' };
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Secure checkout is temporarily unavailable.' }, { status: 503 });

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in to pay this invoice.' }, { status: 401 });

    const { invoiceId, checkoutAttemptId = '', returnPath = '' } = await req.json().catch(() => ({}));
    meta.invoiceId = invoiceId;
    meta.checkoutAttemptId = checkoutAttemptId;
    if (!invoiceId || !validAttemptId(checkoutAttemptId)) {
      return Response.json({ error: 'Invoice and checkout attempt are required.' }, { status: 400 });
    }

    let invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
    if (!invoice) return Response.json({ error: 'Invoice not found.' }, { status: 404 });
    const job = invoice.job_id ? await base44.asServiceRole.entities.Job.get(invoice.job_id).catch(() => null) : null;
    if (!canAccessInvoice(user, invoice, job)) return Response.json({ error: 'You do not have access to this invoice.' }, { status: 403 });
    if (!STAFF_ROLES.has(user.role) && invoice.invoiceVisibility !== 'customer_visible') {
      return Response.json({ error: 'This invoice is not available for payment.' }, { status: 403 });
    }
    if (blockingStatuses.has(invoice.status)) return Response.json({ error: 'This invoice cannot be paid online.' }, { status: 400 });

    const amount = Math.round((Number(invoice.amount) || 0) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return Response.json({ error: 'Invoice amount must be greater than zero.' }, { status: 400 });
    }

    if (invoice.checkout_attempt_id === checkoutAttemptId && invoice.stripe_checkout_session_id) {
      const existingSession = await stripe.checkout.sessions.retrieve(invoice.stripe_checkout_session_id).catch(() => null);
      if (existingSession?.payment_status === 'paid') {
        return Response.json({ status: 'paid', invoiceId: invoice.id, checkoutAttemptId });
      }
      if (existingSession?.status === 'open' && existingSession.url) {
        return Response.json({ url: existingSession.url, invoiceId: invoice.id, checkoutAttemptId });
      }
      return Response.json({ error: 'This checkout attempt has expired. Please try again.' }, { status: 409 });
    }

    try {
      invoice = await lockAppliedReward(base44.asServiceRole.entities, invoice);
    } catch (error) {
      return Response.json({ error: error.message || 'The selected reward is no longer available.' }, { status: 409 });
    }

    const isStaff = STAFF_ROLES.has(user.role) || user.is_customer === false || user.data?.is_customer === false;
    const safeReturnPath = cleanReturnPath(returnPath, isStaff);
    const origin = await resolveTrustedOrigin(req, base44);
    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      payment_flow: 'invoice_payment',
      invoice_id: invoice.id,
      job_id: invoice.job_id || '',
      customer_id: invoice.customer_id || '',
      checkout_attempt_id: checkoutAttemptId,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: job?.customer_email || user.email || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: String(invoice.currency || 'AUD').toLowerCase(),
          unit_amount: amount,
          product_data: {
            name: invoice.number ? `Invoice ${invoice.number}` : 'Invoice payment',
            description: job?.reference ? `Job ${job.reference}` : 'Invoice payment',
          },
        },
      }],
      success_url: `${origin}${appendResult(safeReturnPath, 'success', invoice.id, checkoutAttemptId, true)}`,
      cancel_url: `${origin}${appendResult(safeReturnPath, 'cancelled', invoice.id, checkoutAttemptId)}`,
      metadata,
      payment_intent_data: { metadata },
    }, { idempotencyKey: `invoice:${Deno.env.get('BASE44_APP_ID') || 'app'}:${invoice.id}:${checkoutAttemptId}` });

    await base44.asServiceRole.entities.Invoice.update(invoice.id, {
      payment_provider: 'stripe',
      checkout_attempt_id: checkoutAttemptId,
      stripe_checkout_session_id: session.id,
      checkout_started_at: new Date().toISOString(),
    });

    return Response.json({ url: session.url, invoiceId: invoice.id, checkoutAttemptId });
  } catch (error) {
    console.error('[createInvoiceCheckout] failed', JSON.stringify({ ...meta, message: error.message, stack: error.stack }));
    return Response.json({ error: 'Could not start payment checkout. Please try again.' }, { status: 500 });
  }
});
