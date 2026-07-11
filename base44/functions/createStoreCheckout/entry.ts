import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { buildOrderItems } from './domain.ts';

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe is not configured.' }, { status: 500 });

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const base44 = createClientFromRequest(req);
    const { customer = {}, items = [], fulfilment_method = 'delivery', shipping_address = '', notes = '' } = await req.json().catch(() => ({}));

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Your cart is empty.' }, { status: 400 });
    }
    if (!customer.customer_name || !customer.customer_email || !customer.customer_phone) {
      return Response.json({ error: 'Name, email and phone are required.' }, { status: 400 });
    }
    if (fulfilment_method === 'delivery' && !shipping_address) {
      return Response.json({ error: 'Shipping address is required for delivery.' }, { status: 400 });
    }

    const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))];
    const products = [];
    for (const productId of productIds) {
      const product = await base44.asServiceRole.entities.Product.get(productId).catch(() => null);
      if (product) products.push(product);
    }

    const cart = buildOrderItems(items, products);
    if (!cart.ok) return Response.json({ error: cart.error }, { status: 400 });
    const orderItems = cart.items;
    const total = cart.total;

    const reference = `ORD-${Date.now().toString().slice(-6)}`;
    const order = await base44.asServiceRole.entities.Order.create({
      reference,
      customer_name: customer.customer_name,
      customer_email: customer.customer_email,
      customer_phone: customer.customer_phone,
      shipping_address,
      fulfilment_method,
      notes,
      items: orderItems,
      subtotal: total,
      total,
      currency: 'AUD',
      status: 'received',
      supplier: 'eScootNow',
    });

    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      payment_flow: 'store_order',
      order_id: order.id,
      order_reference: order.reference || '',
    };

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || 'https://app.base44.com';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customer.customer_email,
      line_items: orderItems.map((item) => ({
        quantity: item.qty,
        price_data: {
          currency: 'aud',
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.name,
            description: item.sku ? `SKU: ${item.sku}` : undefined,
          },
        },
      })),
      success_url: `${origin}/store?payment=success&order=${encodeURIComponent(order.id)}`,
      cancel_url: `${origin}/store?payment=cancelled&order=${encodeURIComponent(order.id)}`,
      metadata,
      payment_intent_data: { metadata },
    });

    return Response.json({ url: session.url, orderId: order.id, reference: order.reference });
  } catch (error) {
    console.error('[createStoreCheckout] failed', error.message, error.stack);
    return Response.json({ error: error.message || 'Could not start store checkout.' }, { status: 500 });
  }
});
