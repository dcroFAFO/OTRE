import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';
import { resolveTrustedOrigin } from '../../shared/origin.ts';

const FALLBACK_PICKUP_ADDRESS = '11 Lucinda Street, Woolloongabba QLD 4102';
const MAX_LINE_ITEMS = 50;
const MAX_QUANTITY = 50;

function validAttemptId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value);
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

async function pickupDetails(base44) {
  const profiles = await base44.asServiceRole.entities.BusinessProfile.list('-updated_date', 1).catch(() => []);
  const profile = profiles[0] || {};
  return {
    address: cleanText(profile.address || profile.workshop_address || FALLBACK_PICKUP_ADDRESS, 300),
    instructions: cleanText(profile.pickup_instructions || 'We will contact you when your order is ready for collection.', 500),
  };
}

Deno.serve(async (req) => {
  const meta = { fn: 'createStoreCheckout' };
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Secure checkout is temporarily unavailable.' }, { status: 503 });

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const base44 = createClientFromRequest(req);
    const { customer = {}, items = [], notes = '', checkoutAttemptId = '' } = await req.json().catch(() => ({}));
    meta.checkoutAttemptId = checkoutAttemptId;

    if (!validAttemptId(checkoutAttemptId)) {
      return Response.json({ error: 'A valid checkout attempt is required.' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINE_ITEMS) {
      return Response.json({ error: 'Your cart is empty or contains too many items.' }, { status: 400 });
    }

    const customerName = cleanText(customer.customer_name, 160);
    const customerEmail = cleanText(customer.customer_email, 254).toLowerCase();
    const customerPhone = cleanText(customer.customer_phone, 60);
    if (!customerName || !customerEmail || !customerPhone) {
      return Response.json({ error: 'Name, email and phone are required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const existingOrders = await base44.asServiceRole.entities.Order.filter({ checkout_attempt_id: checkoutAttemptId }, '-created_date', 2);
    const existing = existingOrders[0] || null;
    if (existing?.stripe_checkout_session_id) {
      const existingSession = await stripe.checkout.sessions.retrieve(existing.stripe_checkout_session_id).catch(() => null);
      if (existingSession?.payment_status === 'paid') {
        return Response.json({ orderId: existing.id, reference: existing.reference, status: 'paid', checkoutAttemptId });
      }
      if (existingSession?.status === 'open' && existingSession.url) {
        return Response.json({ url: existingSession.url, orderId: existing.id, reference: existing.reference, checkoutAttemptId });
      }
      return Response.json({ error: 'This checkout attempt has expired. Return to your cart and try again.' }, { status: 409 });
    }

    const requestedQuantities = new Map();
    for (const item of items) {
      const productId = cleanText(item?.product_id, 100);
      if (!productId) continue;
      const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(item.qty) || 1)));
      requestedQuantities.set(productId, Math.min(MAX_QUANTITY, (requestedQuantities.get(productId) || 0) + quantity));
    }

    const orderItems = [];
    for (const [productId, quantity] of requestedQuantities.entries()) {
      const product = await base44.asServiceRole.entities.Product.get(productId).catch(() => null);
      if (!product?.active) continue;
      const price = Number(product.price);
      if (!Number.isFinite(price) || price <= 0) {
        return Response.json({ error: 'One or more products are not currently available for checkout.' }, { status: 400 });
      }
      orderItems.push({
        product_id: product.id,
        name: cleanText(product.name || 'Product', 250),
        sku: cleanText(product.sku, 100),
        qty: quantity,
        price,
      });
    }

    if (orderItems.length !== requestedQuantities.size || orderItems.length === 0) {
      return Response.json({ error: 'Your cart changed. Review the available products and try again.' }, { status: 409 });
    }

    const total = Math.round(orderItems.reduce((sum, item) => sum + item.qty * item.price, 0) * 100) / 100;
    const amount = Math.round(total * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return Response.json({ error: 'Order total must be greater than zero.' }, { status: 400 });
    }

    const pickup = await pickupDetails(base44);
    const reference = `ORD-${Date.now().toString().slice(-6)}`;
    const order = await base44.asServiceRole.entities.Order.create({
      reference,
      checkout_attempt_id: checkoutAttemptId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: '',
      fulfilment_method: 'click_collect',
      pickup_address: pickup.address,
      pickup_instructions: pickup.instructions,
      notes: cleanText(notes, 1000),
      items: orderItems,
      subtotal: total,
      total,
      currency: 'AUD',
      status: 'pending_payment',
      payment_status: 'pending',
      supplier: 'eScootNow',
    });

    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      payment_flow: 'store_order',
      order_id: order.id,
      order_reference: order.reference || '',
      checkout_attempt_id: checkoutAttemptId,
    };

    const origin = await resolveTrustedOrigin(req, base44);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
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
      success_url: `${origin}/store?payment=success&session_id={CHECKOUT_SESSION_ID}&order=${encodeURIComponent(order.id)}&attempt=${encodeURIComponent(checkoutAttemptId)}`,
      cancel_url: `${origin}/store?payment=cancelled&order=${encodeURIComponent(order.id)}&attempt=${encodeURIComponent(checkoutAttemptId)}`,
      metadata,
      payment_intent_data: { metadata },
    }, { idempotencyKey: `store:${Deno.env.get('BASE44_APP_ID') || 'app'}:${checkoutAttemptId}` });

    const canonicalOrderId = session.metadata?.order_id || order.id;
    if (canonicalOrderId !== order.id) {
      await base44.asServiceRole.entities.Order.update(order.id, { status: 'cancelled' }).catch(() => null);
      const canonicalOrder = await base44.asServiceRole.entities.Order.get(canonicalOrderId).catch(() => null);
      if (canonicalOrder) {
        await base44.asServiceRole.entities.Order.update(canonicalOrder.id, { stripe_checkout_session_id: session.id });
        return Response.json({ url: session.url, orderId: canonicalOrder.id, reference: canonicalOrder.reference, checkoutAttemptId });
      }
    }

    await base44.asServiceRole.entities.Order.update(order.id, { stripe_checkout_session_id: session.id });
    return Response.json({ url: session.url, orderId: order.id, reference: order.reference, checkoutAttemptId });
  } catch (error) {
    console.error('[createStoreCheckout] failed', JSON.stringify({ ...meta, message: error.message, stack: error.stack }));
    return Response.json({ error: 'Could not start store checkout. Please try again.' }, { status: 500 });
  }
});
