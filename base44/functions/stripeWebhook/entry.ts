import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';

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

        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'processing',
          notes: `${order.notes || ''}${order.notes ? '\n\n' : ''}Stripe payment received: ${session.payment_intent || session.id}`,
        });

        return Response.json({ received: true });
      }

      const invoiceId = metadata.invoice_id;
      const jobId = metadata.job_id;
      if (!invoiceId) return Response.json({ received: true, skipped: 'missing invoice metadata' });

      const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
      if (!invoice) return Response.json({ received: true, skipped: 'invoice not found' });
      if (invoice.status === 'paid') return Response.json({ received: true, skipped: 'payment already recorded' });

      const paidDate = new Date().toISOString();
      await base44.asServiceRole.entities.Invoice.update(invoice.id, {
        status: 'paid',
        paid_date: paidDate,
        payment_provider: 'stripe',
        payment_intent_ref: session.payment_intent || session.id,
        payment_method: 'card',
      });

      const job = jobId ? await base44.asServiceRole.entities.Job.get(jobId).catch(() => null) : null;
      if (job) {
        await base44.asServiceRole.entities.Job.update(job.id, {
          payment_status: 'paid',
          status: 'paid',
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
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const invoiceId = intent.metadata?.invoice_id;
      if (!invoiceId) return Response.json({ received: true, skipped: 'no invoice metadata' });
      const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
      if (!invoice) return Response.json({ received: true, skipped: 'invoice not found' });
      if (invoice.status === 'paid') return Response.json({ received: true, skipped: 'already paid' });
      await base44.asServiceRole.entities.Invoice.update(invoice.id, { status: 'failed' });
      return Response.json({ received: true });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] failed', error.message, error.stack);
    return Response.json({ error: error.message || 'Stripe webhook failed' }, { status: 400 });
  }
});