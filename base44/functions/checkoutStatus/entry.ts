import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { settleInvoiceRewards } from '../../shared/rewardLifecycle.ts';

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);

function canAccessInvoice(user, invoice, job) {
  if (STAFF_ROLES.has(user.role) || user.is_customer === false || user.data?.is_customer === false) return true;
  const customerIds = new Set([user.id, user.customer_id, user.data?.customer_id].filter(Boolean));
  if (invoice.customer_id && customerIds.has(invoice.customer_id)) return true;
  if (job?.customer_user_id && job.customer_user_id === user.id) return true;
  const userEmail = String(user.email || '').trim().toLowerCase();
  const customerEmail = String(job?.customer_email || '').trim().toLowerCase();
  return !!userEmail && !!customerEmail && userEmail === customerEmail;
}

Deno.serve(async (req) => {
  const meta = { fn: 'checkoutStatus' };
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Payment verification is temporarily unavailable.' }, { status: 503 });

    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const { flow, sessionId, orderId, invoiceId, checkoutAttemptId = '' } = await req.json().catch(() => ({}));
    meta.flow = flow;
    meta.sessionId = sessionId;
    if (!sessionId || !['store', 'invoice'].includes(flow)) {
      return Response.json({ error: 'Checkout session details are required.' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
    if (!session) return Response.json({ error: 'Checkout session not found.' }, { status: 404 });
    const metadata = session.metadata || {};
    if (metadata.base44_app_id && metadata.base44_app_id !== Deno.env.get('BASE44_APP_ID')) {
      return Response.json({ error: 'Checkout session not found.' }, { status: 404 });
    }

    if (flow === 'store') {
      if (metadata.payment_flow !== 'store_order' || !orderId || metadata.order_id !== orderId) {
        return Response.json({ error: 'Checkout session does not match this order.' }, { status: 403 });
      }
      if (checkoutAttemptId && metadata.checkout_attempt_id !== checkoutAttemptId) {
        return Response.json({ error: 'Checkout session does not match this cart.' }, { status: 403 });
      }
      const order = await base44.asServiceRole.entities.Order.get(orderId).catch(() => null);
      if (!order || order.checkout_attempt_id !== metadata.checkout_attempt_id) {
        return Response.json({ error: 'Order not found.' }, { status: 404 });
      }

      if (session.payment_status === 'paid') {
        if (order.payment_status !== 'paid') {
          await base44.asServiceRole.entities.Order.update(order.id, {
            status: 'processing',
            payment_status: 'paid',
            paid_date: new Date().toISOString(),
            stripe_checkout_session_id: session.id,
            payment_intent_ref: String(session.payment_intent || session.id),
          });
        }
        return Response.json({
          status: 'paid',
          orderId: order.id,
          reference: order.reference,
          checkoutAttemptId: metadata.checkout_attempt_id,
        });
      }

      if (session.status === 'expired') {
        if (order.payment_status === 'pending') {
          await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'expired' });
        }
        return Response.json({ status: 'expired', orderId: order.id, reference: order.reference, checkoutAttemptId: metadata.checkout_attempt_id });
      }

      return Response.json({ status: 'pending', orderId: order.id, reference: order.reference, checkoutAttemptId: metadata.checkout_attempt_id });
    }

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in to verify this invoice payment.' }, { status: 401 });
    if (metadata.payment_flow !== 'invoice_payment' || !invoiceId || metadata.invoice_id !== invoiceId) {
      return Response.json({ error: 'Checkout session does not match this invoice.' }, { status: 403 });
    }
    if (checkoutAttemptId && metadata.checkout_attempt_id !== checkoutAttemptId) {
      return Response.json({ error: 'Checkout session does not match this payment attempt.' }, { status: 403 });
    }

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
    if (!invoice) return Response.json({ error: 'Invoice not found.' }, { status: 404 });
    const job = invoice.job_id ? await base44.asServiceRole.entities.Job.get(invoice.job_id).catch(() => null) : null;
    if (!canAccessInvoice(user, invoice, job)) return Response.json({ error: 'You do not have access to this invoice.' }, { status: 403 });

    if (session.payment_status === 'paid') {
      const paidDate = invoice.paid_date || new Date().toISOString();
      if (invoice.status !== 'paid') {
        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          status: 'paid',
          paid_date: paidDate,
          payment_provider: 'stripe',
          stripe_checkout_session_id: session.id,
          payment_intent_ref: String(session.payment_intent || session.id),
          payment_method: 'card',
        });
        if (job) {
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
      }
      await settleInvoiceRewards(base44.asServiceRole.entities, { ...invoice, status: 'paid', paid_date: paidDate }, job, paidDate);
      return Response.json({ status: 'paid', invoiceId: invoice.id, reference: invoice.number, checkoutAttemptId: metadata.checkout_attempt_id });
    }

    return Response.json({ status: session.status === 'expired' ? 'expired' : 'pending', invoiceId: invoice.id, reference: invoice.number, checkoutAttemptId: metadata.checkout_attempt_id });
  } catch (error) {
    console.error('[checkoutStatus] failed', JSON.stringify({ ...meta, message: error.message, stack: error.stack }));
    return Response.json({ error: 'Payment could not be verified. Please try again.' }, { status: 500 });
  }
});
