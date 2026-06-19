import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateCustomerId() {
  return `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function getUserFromPayload(base44, payload) {
  const userId = payload?.event?.entity_id;
  if (!userId) return null;
  if (!payload.payload_too_large && payload.data) return payload.data;

  const users = await base44.asServiceRole.entities.User.filter({ id: userId }, '', 1);
  return users[0] || null;
}

async function customerIdExists(base44, customerId, currentUserId) {
  const users = await base44.asServiceRole.entities.User.filter({ customer_id: customerId }, '', 2);
  if (users.some((user) => user.id !== currentUserId)) return true;

  const customers = await base44.asServiceRole.entities.Customer.filter({ customer_id: customerId }, '', 1);
  return customers.length > 0;
}

async function createUniqueCustomerId(base44, userId) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const customerId = generateCustomerId();
    if (!(await customerIdExists(base44, customerId, userId))) return customerId;
  }
  throw new Error('Unable to generate a unique customer_id');
}

async function assignCustomerId(base44, user) {
  if (!user?.id || user.is_customer !== true) {
    return { skipped: 'user is not marked as customer', user_id: user?.id || null };
  }

  if (user.customer_id) {
    const duplicateExists = await customerIdExists(base44, user.customer_id, user.id);
    if (duplicateExists) {
      return { error: 'Existing customer_id is already used by another record', user_id: user.id };
    }
    return { skipped: 'customer_id already assigned', customer_id: user.customer_id, user_id: user.id };
  }

  const customerId = await createUniqueCustomerId(base44, user.id);
  await base44.asServiceRole.entities.User.update(user.id, { customer_id: customerId });
  return { assigned: true, customer_id: customerId, user_id: user.id };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    if (payload?.event?.entity_name === 'User') {
      const user = await getUserFromPayload(base44, payload);
      if (!user?.id) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      return Response.json(await assignCustomerId(base44, user));
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    const customerUsersMissingId = users.filter((user) => user.is_customer === true && !user.customer_id);
    const results = [];

    for (const user of customerUsersMissingId) {
      results.push(await assignCustomerId(base44, user));
    }

    return Response.json({
      scanned: users.length,
      missing_customer_id: customerUsersMissingId.length,
      assigned: results.filter((result) => result.assigned).length,
      results,
    });
  } catch (error) {
    console.error('[assignCustomerIdToNewUser] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});