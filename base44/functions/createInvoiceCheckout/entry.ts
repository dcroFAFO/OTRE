import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { authorizeInvoiceCheckout } from '../_shared/authorization.ts';
import { validateInvoiceCheckout } from './domain.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoiceId } = await req.json().catch(() => ({}));
    if (!invoiceId) return Response.json({ error: 'invoiceId is required' }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId).catch(() => null);
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });
    const job = invoice.job_id ? await base44.asServiceRole.entities.Job.get(invoice.job_id).catch(() => null) : null;
    if (!authorizeInvoiceCheckout(user, invoice, job).allowed) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const checkout = validateInvoiceCheckout(invoice);
    if (!checkout.ok) return Response.json({ error: checkout.error }, { status: 400 });
    const amount = checkout.amount;

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe is not configured.' }, { status: 500 });
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || 'https://app.base44.com';
    const successUrl = `${origin}/portal?payment=success&invoice=${encodeURIComponent(invoice.id)}`;
    const cancelUrl = `${origin}/portal?payment=cancelled&invoice=${encodeURIComponent(invoice.id)}`;

    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      invoice_id: invoice.id,
      job_id: invoice.job_id || '',
      customer_id: invoice.customer_id || '',
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: job?.customer_email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: String(invoice.currency || 'AUD').toLowerCase(),
            unit_amount: amount,
            product_data: {
              name: invoice.number ? `Invoice ${invoice.number}` : 'Invoice payment',
              description: job?.reference ? `Job ${job.reference}` : 'Invoice payment',
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: { metadata },
    });

    await base44.asServiceRole.entities.Invoice.update(invoice.id, {
      payment_provider: 'stripe',
      payment_intent_ref: session.id,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[createInvoiceCheckout] failed', error.message, error.stack);
    return Response.json({ error: error.message || 'Could not start payment checkout.' }, { status: 500 });
  }
});
