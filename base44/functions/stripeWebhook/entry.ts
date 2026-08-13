import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { settleInvoiceRewards, unlockExpiredCheckoutReward } from '../../shared/rewardLifecycle.ts';

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!signature || !secret || !stripeKey) return Response.json({ error: 'Missing Stripe webhook configuration' }, { status: 400 });

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, secret);
    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      if (metadata.base44_app_id && metadata.base44_app_id !== Deno.env.get('BASE44_APP_ID')) {
        return Response.json({ received: true, skipped: 'different app' });
      }

      if (metadata.payment_flow === 'store_order') {
        const orderId = metadata.order_id;
        if (!orderId) return Response.json({ received: true, skipped: 'missing order metadata' });

        const order = await base44.asServiceRole.entities.Order.get(orderId).catch(() => null);
        if (!order) return Response.json({ received: true, skipped: 'order not found' });
        if (order.payment_status === 'paid') return Response.json({ received: true, skipped: 'store payment already recorded' });
        if (metadata.checkout_attempt_id && order.checkout_attempt_id !== metadata.checkout_attempt_id) {
          return Response.json({ received: true, skipped: 'checkout attempt mismatch' });
        }

        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'processing',
          payment_status: 'paid',
          paid_date: new Date().toISOString(),
          stripe_checkout_session_id: session.id,
          payment_intent_ref: String(session.payment_intent || session.id),
        });

        return Response.json({ received: true });
      }

      const invoiceId = metadata.invoice_id;
      const jobId = metadata.job_id;
      if (!invoiceId) return Response.json({ received: true, skipped: 'missing invoice metadata' });

      const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
      if (!invoice) return Response.json({ received: true, skipped: 'invoice not found' });
      const job = jobId ? await base44.asServiceRole.entities.Job.get(jobId).catch(() => null) : null;
      const paidDate = invoice.paid_date || new Date().toISOString();
      if (invoice.status !== 'paid') {
        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          status: 'paid',
          paid_date: paidDate,
          payment_provider: 'stripe',
          payment_intent_ref: session.payment_intent || session.id,
          payment_method: 'card',
        });
      }

      if (job && invoice.status !== 'paid') {
        await base44.asServiceRole.entities.Job.update(job.id, {
          payment_status: 'paid',
          status: 'completed',
        });

        await base44.asServiceRole.entities.AuditEvent.create({
          event_type: 'payment_received',
          job_id: job.job_id || job.id,
          customer_id: invoice.customer_id || job.customer_id || '',
          actor_id: 'stripe',
          actor_name: 'Stripe',
          actor_role: 'system',
          previous_value: invoice.status || '',
          new_value: 'paid',
          summary: `Stripe payment received for ${invoice.currency || 'AUD'} ${Number(invoice.amount || 0).toFixed(2)}`,
          visibility: 'customer',
        });
      }
      await settleInvoiceRewards(base44.asServiceRole.entities, { ...invoice, status: 'paid', paid_date: paidDate }, job, paidDate);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      if (intent.metadata?.payment_flow === 'store_order') {
        const orderId = intent.metadata?.order_id;
        if (!orderId) return Response.json({ received: true, skipped: 'no order metadata' });
        const order = await base44.asServiceRole.entities.Order.get(orderId).catch(() => null);
        if (!order || order.payment_status === 'paid') return Response.json({ received: true, skipped: 'order unavailable or already paid' });
        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'payment_failed',
          payment_status: 'failed',
          payment_intent_ref: String(intent.id),
        });
        return Response.json({ received: true });
      }
      const invoiceId = intent.metadata?.invoice_id;
      if (!invoiceId) return Response.json({ received: true, skipped: 'no invoice metadata' });
      const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
      if (!invoice) return Response.json({ received: true, skipped: 'invoice not found' });
      if (invoice.status === 'paid') return Response.json({ received: true, skipped: 'already paid' });
      // Keep the canonical invoice status outstanding; record the failed
      // attempt separately so a card decline cannot corrupt lifecycle metrics.
      await base44.asServiceRole.entities.Invoice.update(invoice.id, {
        last_payment_error_at: new Date().toISOString(),
        payment_intent_ref: String(intent.id),
      });
      return Response.json({ received: true });
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      if (metadata.payment_flow === 'store_order' && metadata.order_id) {
        const order = await base44.asServiceRole.entities.Order.get(metadata.order_id).catch(() => null);
        if (order && order.payment_status === 'pending') {
          await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'expired' });
        }
      }
      if (metadata.payment_flow === 'invoice_payment' && metadata.invoice_id) {
        const invoice = await base44.asServiceRole.entities.Invoice.get(metadata.invoice_id).catch(() => null);
        if (invoice && invoice.status !== 'paid' && invoice.stripe_checkout_session_id === session.id) {
          await unlockExpiredCheckoutReward(base44.asServiceRole.entities, invoice);
        }
      }
      return Response.json({ received: true });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] failed', error.message, error.stack);
    return Response.json({ error: 'Stripe webhook could not be processed.' }, { status: 400 });
  }
});
