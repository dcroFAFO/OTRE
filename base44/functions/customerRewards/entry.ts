import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const DAY_MS = 24 * 60 * 60 * 1000;
const MUTABLE_INVOICE_STATUSES = new Set(['issued', 'outstanding']);

function clean(value: unknown, maxLength = 200) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function roundMoney(value: unknown) {
  return Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
}

function addDays(value: string, days: number) {
  return new Date(new Date(value).getTime() + days * DAY_MS).toISOString();
}

function rewardCode(kind: string, idempotencyKey: string) {
  const prefix = kind === 'referred_first_invoice_credit' ? 'WELCOME' : kind === 'referrer_discount' ? 'REFER' : 'LOYAL';
  const suffix = Array.from(idempotencyKey)
    .reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 7)
    .toString(36)
    .toUpperCase()
    .slice(-6);
  return `OTR-${prefix}-${suffix}`;
}

async function resolveCustomer(db: any, userId: string) {
  const rows = await db.Customer.filter({ user_id: userId }, '-updated_date', 2).catch(() => []);
  if (rows.length > 1) return { error: 'Your customer identity needs administrator review.', status: 409 };
  if (!rows[0]) return { error: 'Finish creating your customer profile before using rewards.', status: 409 };
  return { customer: rows[0] };
}

async function resolveOwnedInvoice(db: any, customer: any, invoiceId: string) {
  if (!invoiceId) return { error: 'An invoice is required.', status: 400 };
  const invoice = await db.Invoice.get(invoiceId).catch(() => null);
  if (!invoice) return { error: 'Invoice not found.', status: 404 };
  const job = invoice.job_id ? await db.Job.get(invoice.job_id).catch(() => null) : null;
  if (!job) return { error: 'The invoice is not linked to a valid job.', status: 409 };
  if (job.customer_account_id !== customer.id) return { error: 'You do not have access to this invoice.', status: 403 };
  if (invoice.customer_account_id && invoice.customer_account_id !== customer.id) {
    return { error: 'The invoice ownership record needs administrator review.', status: 409 };
  }
  if (invoice.invoiceVisibility !== 'customer_visible') return { error: 'This invoice is not available.', status: 403 };
  return { invoice, job };
}

async function invoiceHasPaymentHistory(db: any, invoiceId: string) {
  const events = await db.PaymentEvent.filter({ invoice_id: invoiceId }, '-occurred_at', 1);
  return events.length > 0;
}

async function issueReward(db: any, input: any) {
  const existing = await db.CustomerReward.filter({ idempotency_key: input.idempotency_key }, '-created_date', 2).catch(() => []);
  if (existing.length > 1) throw new Error('Duplicate reward issuance requires administrator review.');
  if (existing[0]) {
    if (existing[0].customer_account_id !== input.customer.id) throw new Error('Reward issuance key conflict.');
    return { reward: existing[0], created: false };
  }
  const issuedAt = input.issued_at || new Date().toISOString();
  const reward = await db.CustomerReward.create({
    customer_account_id: input.customer.id,
    customer_id: input.customer.customer_id || '',
    auth_user_id: input.customer.user_id,
    source_customer_account_id: input.source_customer_account_id || '',
    source_job_id: input.source_job_id || '',
    source_invoice_id: input.source_invoice_id || '',
    kind: input.kind,
    status: 'available',
    code: rewardCode(input.kind, input.idempotency_key),
    description: input.description,
    discount_type: input.discount_type,
    value: input.value,
    max_discount: input.max_discount || 0,
    applies_to: input.applies_to || 'all',
    issued_at: issuedAt,
    expires_at: addDays(issuedAt, input.valid_days),
    idempotency_key: input.idempotency_key,
    metadata: input.metadata || {},
  });
  return { reward, created: true };
}

async function expireAvailableRewards(db: any, rewards: any[]) {
  const expiredIds = new Set<string>();
  for (const reward of rewards) {
    if (reward.status === 'available' && reward.expires_at && new Date(reward.expires_at).getTime() <= Date.now()) {
      await db.CustomerReward.update(reward.id, { status: 'expired' }).catch(() => null);
      expiredIds.add(reward.id);
    }
  }
  return rewards.map((reward) => expiredIds.has(reward.id) ? { ...reward, status: 'expired' } : reward);
}

function lineTotal(item: any) {
  if (Number.isFinite(Number(item.customer_line_total))) return roundMoney(item.customer_line_total);
  const quantity = Number(item.qty ?? item.quantity ?? 1) || 0;
  const unitPrice = Number(item.customer_unit_price ?? item.unit_price ?? 0) || 0;
  return roundMoney(quantity * unitPrice);
}

function labourTotal(invoice: any) {
  return roundMoney((invoice.line_items || []).reduce((sum: number, item: any) => {
    const label = `${item.kind || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase();
    return /labou?r|service|diagnostic|workshop time/.test(label) ? sum + lineTotal(item) : sum;
  }, 0));
}

function calculateRewardDiscount(reward: any, invoice: any) {
  const baseAmount = roundMoney(invoice.pre_reward_amount ?? (Number(invoice.amount || 0) + Number(invoice.reward_discount_amount || 0)));
  const eligibleAmount = reward.applies_to === 'labour' ? labourTotal(invoice) : baseAmount;
  if (baseAmount <= 0 || eligibleAmount <= 0) return { baseAmount, discount: 0 };
  const rawDiscount = reward.discount_type === 'fixed'
    ? Number(reward.value || 0)
    : eligibleAmount * (Number(reward.value || 0) / 100);
  const cappedDiscount = Number(reward.max_discount || 0) > 0
    ? Math.min(rawDiscount, Number(reward.max_discount))
    : rawDiscount;
  return { baseAmount, discount: roundMoney(Math.min(baseAmount, cappedDiscount)) };
}

function rewardPayload(reward: any) {
  return {
    id: reward.id,
    kind: reward.kind,
    status: reward.status,
    code: reward.code,
    description: reward.description,
    discount_type: reward.discount_type,
    value: reward.value,
    max_discount: reward.max_discount,
    applies_to: reward.applies_to,
    issued_at: reward.issued_at,
    expires_at: reward.expires_at,
    applied_invoice_id: reward.applied_invoice_id || '',
  };
}

function customerInvoicePayload(invoice: any) {
  return {
    id: invoice.id,
    job_id: invoice.job_id,
    number: invoice.number || '',
    amount: Number(invoice.amount || 0),
    amount_minor: Number(invoice.amount_minor || 0),
    currency: invoice.currency || 'AUD',
    status: invoice.status,
    invoiceVisibility: invoice.invoiceVisibility,
    issued_at: invoice.issued_at || '',
    due_date: invoice.due_date || '',
    customer_notes: invoice.customer_notes || '',
    line_items: (invoice.line_items || []).map((item: any) => ({
      description: item.description || '',
      qty: Number(item.qty ?? item.quantity ?? 0),
      unit_price: Number(item.customer_unit_price ?? item.unit_price ?? 0),
      customer_unit_price: Number(item.customer_unit_price ?? item.unit_price ?? 0),
      customer_line_total: lineTotal(item),
      tax_rate: Number(item.tax_rate || 0),
      discount_amount: Number(item.discount_amount || 0),
      kind: item.kind || '',
      category: item.category || '',
      sku: item.sku || '',
    })),
    pre_reward_amount: Number(invoice.pre_reward_amount || 0),
    reward_id: invoice.reward_id || '',
    reward_kind: invoice.reward_kind || '',
    reward_discount_amount: Number(invoice.reward_discount_amount || 0),
    reward_applied_at: invoice.reward_applied_at || '',
    reward_snapshot: invoice.reward_snapshot || {},
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Use POST for this action.' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in to manage rewards.' }, { status: 401 });
    if (user.role !== 'customer') return Response.json({ error: 'Rewards are managed from a customer account.' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = clean(body.action || 'list', 40);
    const resolved = await resolveCustomer(db, user.id);
    if (resolved.error) return Response.json({ error: resolved.error }, { status: resolved.status });
    const customer = resolved.customer;

    if (action === 'list') {
      const rows = await db.CustomerReward.filter({ customer_account_id: customer.id }, '-issued_at', 100).catch(() => []);
      const rewards = await expireAvailableRewards(db, rows);
      const available = rewards.filter((reward: any) => reward.status === 'available');
      return Response.json({
        rewards: rewards.map(rewardPayload),
        available_count: available.length,
        loyalty: {
          paid_repairs: Number(customer.loyalty_paid_repair_count || 0),
          next_reward_at: (Math.floor(Number(customer.loyalty_paid_repair_count || 0) / 5) + 1) * 5,
        },
        referral: {
          code: customer.referral_code || '',
          status: customer.referral_status || 'none',
        },
      });
    }

    if (action === 'claimReferral') {
      const code = clean(body.code, 24).toUpperCase();
      if (!/^OTR-[A-Z0-9-]{4,20}$/.test(code)) return Response.json({ error: 'Enter a valid referral code.' }, { status: 400 });
      if (customer.referred_by_customer_id || customer.referral_claimed_at) {
        return Response.json({ error: 'A referral code has already been claimed for this account.' }, { status: 409 });
      }
      const referrers = await db.Customer.filter({ referral_code: code }, '-created_date', 2).catch(() => []);
      if (referrers.length > 1) return Response.json({ error: 'This referral code needs administrator review.' }, { status: 409 });
      const referrer = referrers[0] || null;
      if (!referrer) return Response.json({ error: 'This referral code is invalid or has expired.' }, { status: 404 });
      if (referrer.id === customer.id || referrer.user_id === user.id) return Response.json({ error: 'You cannot use your own referral code.' }, { status: 400 });

      const existingJobs = await db.Job.filter({ customer_account_id: customer.id }, '-created_date', 1).catch(() => []);
      if (existingJobs.length || customer.first_paid_invoice_id) {
        return Response.json({ error: 'Referral codes must be claimed before your first booking.' }, { status: 409 });
      }
      const createdAt = new Date(customer.createdAt || customer.created_date || 0).getTime();
      if (createdAt && Date.now() - createdAt > DAY_MS) {
        return Response.json({ error: 'Referral codes can only be claimed while creating a new account.' }, { status: 409 });
      }

      const now = new Date().toISOString();
      const result = await issueReward(db, {
        customer,
        source_customer_account_id: referrer.id,
        kind: 'referred_first_invoice_credit',
        description: '$10 off your first invoice',
        discount_type: 'fixed',
        value: 10,
        max_discount: 10,
        applies_to: 'first_invoice',
        valid_days: 90,
        issued_at: now,
        idempotency_key: `referred:${customer.id}:${referrer.id}`,
      });
      await db.Customer.update(customer.id, {
        referred_by_customer_id: referrer.id,
        referral_source_code: code,
        referral_claimed_at: now,
        referral_status: 'pending',
        referral_eligible: true,
      });
      return Response.json({ claimed: true, reward: rewardPayload(result.reward) });
    }

    if (action === 'apply') {
      const owned = await resolveOwnedInvoice(db, customer, clean(body.invoice_id, 120));
      if (owned.error) return Response.json({ error: owned.error }, { status: owned.status });
      const { invoice } = owned;
      if (!MUTABLE_INVOICE_STATUSES.has(invoice.status)) return Response.json({ error: 'Rewards can only be changed on an issued, unpaid invoice.' }, { status: 409 });
      if (await invoiceHasPaymentHistory(db, invoice.id)) return Response.json({ error: 'This invoice has payment history and can only be changed by an administrator.' }, { status: 409 });

      const rewardId = clean(body.reward_id, 120);
      if (!rewardId) return Response.json({ error: 'Choose a reward to apply.' }, { status: 400 });
      if (invoice.reward_id && invoice.reward_id !== rewardId) return Response.json({ error: 'Remove the current reward before selecting another.' }, { status: 409 });
      const reward = await db.CustomerReward.get(rewardId).catch(() => null);
      if (!reward || reward.customer_account_id !== customer.id) return Response.json({ error: 'Reward not found.' }, { status: 404 });
      if (invoice.reward_id === reward.id && reward.applied_invoice_id === invoice.id) {
        return Response.json({ invoice: customerInvoicePayload(invoice), reward: rewardPayload(reward) });
      }
      if (reward.status !== 'available') return Response.json({ error: 'This reward is no longer available.' }, { status: 409 });
      if (reward.expires_at && new Date(reward.expires_at).getTime() <= Date.now()) {
        await db.CustomerReward.update(reward.id, { status: 'expired' }).catch(() => null);
        return Response.json({ error: 'This reward has expired.' }, { status: 409 });
      }
      if (reward.applies_to === 'first_invoice' && customer.first_paid_invoice_id) {
        return Response.json({ error: 'This first-invoice reward is no longer eligible.' }, { status: 409 });
      }

      const calculation = calculateRewardDiscount(reward, invoice);
      if (calculation.discount <= 0) {
        return Response.json({ error: reward.applies_to === 'labour' ? 'This invoice has no eligible labour amount.' : 'This reward is not eligible for this invoice.' }, { status: 409 });
      }
      const revisedAmount = roundMoney(calculation.baseAmount - calculation.discount);
      if (revisedAmount === 0) {
        return Response.json({ error: 'A reward that would settle the invoice in full must be completed by the workshop through manual payment reconciliation.' }, { status: 409 });
      }

      const now = new Date().toISOString();
      await db.CustomerReward.update(reward.id, { status: 'applied', applied_invoice_id: invoice.id, applied_at: now });
      let updated;
      try {
        updated = await db.Invoice.update(invoice.id, {
          customer_account_id: customer.id,
          pre_reward_amount: calculation.baseAmount,
          amount: revisedAmount,
          amount_minor: Math.round(revisedAmount * 100),
          reward_id: reward.id,
          reward_kind: reward.kind,
          reward_discount_amount: calculation.discount,
          reward_applied_at: now,
          reward_snapshot: {
            code: reward.code,
            description: reward.description,
            discount_type: reward.discount_type,
            value: reward.value,
            max_discount: reward.max_discount,
            applies_to: reward.applies_to,
          },
        });
      } catch (error) {
        await db.CustomerReward.update(reward.id, { status: 'available', applied_invoice_id: '', applied_at: '' }).catch(() => null);
        throw error;
      }
      return Response.json({ invoice: customerInvoicePayload(updated), reward: rewardPayload({ ...reward, status: 'applied', applied_invoice_id: invoice.id, applied_at: now }) });
    }

    if (action === 'remove') {
      const owned = await resolveOwnedInvoice(db, customer, clean(body.invoice_id, 120));
      if (owned.error) return Response.json({ error: owned.error }, { status: owned.status });
      const { invoice } = owned;
      if (!MUTABLE_INVOICE_STATUSES.has(invoice.status)) return Response.json({ error: 'Rewards can only be changed on an issued, unpaid invoice.' }, { status: 409 });
      if (await invoiceHasPaymentHistory(db, invoice.id)) return Response.json({ error: 'This invoice has payment history and can only be changed by an administrator.' }, { status: 409 });
      if (!invoice.reward_id) return Response.json({ invoice: customerInvoicePayload(invoice), removed: false });

      const reward = await db.CustomerReward.get(invoice.reward_id).catch(() => null);
      if (!reward || reward.customer_account_id !== customer.id || reward.applied_invoice_id !== invoice.id) {
        return Response.json({ error: 'Applied reward not found.' }, { status: 404 });
      }
      if (!['applied', 'locked'].includes(reward.status)) return Response.json({ error: 'This reward can no longer be removed.' }, { status: 409 });

      const restoredAmount = roundMoney(invoice.pre_reward_amount || (Number(invoice.amount || 0) + Number(invoice.reward_discount_amount || 0)));
      const updated = await db.Invoice.update(invoice.id, {
        amount: restoredAmount,
        amount_minor: Math.round(restoredAmount * 100),
        reward_id: '',
        reward_kind: '',
        reward_discount_amount: 0,
        reward_applied_at: '',
        reward_locked_at: '',
        reward_snapshot: {},
      });
      const expired = reward.expires_at && new Date(reward.expires_at).getTime() <= Date.now();
      await db.CustomerReward.update(reward.id, {
        status: expired ? 'expired' : 'available',
        applied_invoice_id: '',
        applied_at: '',
        locked_at: '',
      });
      return Response.json({ invoice: customerInvoicePayload(updated), removed: true });
    }

    return Response.json({ error: 'Unknown reward action.' }, { status: 400 });
  } catch (error) {
    console.error('[customerRewards] failed', error?.message || String(error));
    return Response.json({ error: 'Rewards could not be updated. Please try again.' }, { status: 500 });
  }
});
