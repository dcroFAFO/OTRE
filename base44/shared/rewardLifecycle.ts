export const REWARDS_LAUNCH_AT = globalThis.Deno?.env?.get('REWARDS_LAUNCH_AT') || '2026-08-12T00:00:00.000Z';

const DAY_MS = 24 * 60 * 60 * 1000;

function roundMoney(value: number) {
  return Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS).toISOString();
}

function rewardCode(kind: string, idempotencyKey: string) {
  const prefix = kind === 'referred_first_invoice_credit' ? 'WELCOME' : kind === 'referrer_discount' ? 'REFER' : 'LOYAL';
  const suffix = Array.from(idempotencyKey).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7).toString(36).toUpperCase().slice(-6);
  return `OTR-${prefix}-${suffix}`;
}

export async function resolveInvoiceCustomer(db: any, invoice: any, job: any = null) {
  if (job?.customer_account_id) {
    const direct = await db.Customer.get(job.customer_account_id).catch(() => null);
    if (direct) return direct;
  }
  if (invoice?.customer_account_id) {
    const direct = await db.Customer.get(invoice.customer_account_id).catch(() => null);
    if (direct) return direct;
  }
  const stableId = invoice?.customer_id || job?.customer_id || job?.customerId || '';
  if (stableId) {
    const direct = await db.Customer.get(stableId).catch(() => null);
    if (direct) return direct;
    const matches = await db.Customer.filter({ customer_id: stableId }, '-updated_date', 1).catch(() => []);
    if (matches[0]) return matches[0];
  }
  const email = String(job?.customer_email || '').trim().toLowerCase();
  if (!email) return null;
  const matches = await db.Customer.filter({ email }, '-updated_date', 1).catch(() => []);
  return matches[0] || null;
}

export async function issueReward(db: any, input: any) {
  const existing = await db.CustomerReward.filter({ idempotency_key: input.idempotency_key }, '-created_date', 1).catch(() => []);
  if (existing[0]) return { reward: existing[0], created: false };
  const issuedAt = input.issued_at || new Date().toISOString();
  const reward = await db.CustomerReward.create({
    customer_account_id: input.customer.id,
    customer_id: input.customer.customer_id || '',
    auth_user_id: input.customer.user_id || '',
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
    expires_at: addDays(new Date(issuedAt), input.valid_days),
    idempotency_key: input.idempotency_key,
    metadata: input.metadata || {},
  });
  return { reward, created: true };
}

export async function expireAvailableRewards(db: any, rewards: any[], at = new Date()) {
  const expired = [];
  for (const reward of rewards) {
    if (reward.status === 'available' && reward.expires_at && new Date(reward.expires_at).getTime() <= at.getTime()) {
      await db.CustomerReward.update(reward.id, { status: 'expired' }).catch(() => null);
      expired.push(reward.id);
    }
  }
  return rewards.map((reward) => expired.includes(reward.id) ? { ...reward, status: 'expired' } : reward);
}

function lineTotal(item: any) {
  if (Number.isFinite(Number(item.customer_line_total))) return roundMoney(item.customer_line_total);
  const qty = Number(item.qty ?? item.quantity ?? 1) || 0;
  const unit = Number(item.customer_unit_price ?? item.unit_price ?? item.price ?? 0) || 0;
  return roundMoney(qty * unit);
}

function labourTotal(invoice: any) {
  return roundMoney((invoice.line_items || []).reduce((sum: number, item: any) => {
    const label = `${item.kind || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase();
    return /labou?r|service|diagnostic|workshop time/.test(label) ? sum + lineTotal(item) : sum;
  }, 0));
}

export function calculateRewardDiscount(reward: any, invoice: any) {
  const baseAmount = roundMoney(invoice.pre_reward_amount ?? (Number(invoice.amount || 0) + Number(invoice.reward_discount_amount || 0)));
  const eligibleAmount = reward.applies_to === 'labour' ? labourTotal(invoice) : baseAmount;
  if (baseAmount <= 0 || eligibleAmount <= 0) return { baseAmount, eligibleAmount, discount: 0 };
  const raw = reward.discount_type === 'fixed'
    ? Number(reward.value || 0)
    : eligibleAmount * (Number(reward.value || 0) / 100);
  const capped = Number(reward.max_discount || 0) > 0 ? Math.min(raw, Number(reward.max_discount)) : raw;
  return { baseAmount, eligibleAmount, discount: roundMoney(Math.min(baseAmount, capped)) };
}

export async function lockAppliedReward(db: any, invoice: any, now = new Date().toISOString()) {
  if (!invoice.reward_id) return invoice;
  const reward = await db.CustomerReward.get(invoice.reward_id).catch(() => null);
  if (!reward) throw new Error('The selected reward is no longer available.');
  if (!['applied', 'locked'].includes(reward.status) || reward.applied_invoice_id !== invoice.id) {
    throw new Error('The selected reward is no longer available.');
  }
  if (reward.expires_at && new Date(reward.expires_at).getTime() <= Date.now() && reward.status !== 'locked') {
    await db.CustomerReward.update(reward.id, { status: 'expired' }).catch(() => null);
    throw new Error('The selected reward has expired.');
  }
  if (reward.status !== 'locked') {
    await db.CustomerReward.update(reward.id, { status: 'locked', locked_at: now });
  }
  return await db.Invoice.update(invoice.id, { reward_locked_at: invoice.reward_locked_at || now });
}

export async function releaseInvoiceReward(db: any, invoice: any, now = new Date().toISOString()) {
  if (!invoice?.reward_id) return;
  const reward = await db.CustomerReward.get(invoice.reward_id).catch(() => null);
  if (reward && ['applied', 'locked'].includes(reward.status)) {
    const expired = reward.expires_at && new Date(reward.expires_at).getTime() <= Date.now();
    await db.CustomerReward.update(reward.id, {
      status: expired ? 'expired' : 'available',
      released_at: now,
      applied_invoice_id: '',
      applied_at: '',
      locked_at: '',
    }).catch(() => null);
  }
}

export async function unlockExpiredCheckoutReward(db: any, invoice: any, now = new Date().toISOString()) {
  if (!invoice?.reward_id) return invoice;
  const reward = await db.CustomerReward.get(invoice.reward_id).catch(() => null);
  if (reward && reward.status === 'locked' && reward.applied_invoice_id === invoice.id) {
    const expired = reward.expires_at && new Date(reward.expires_at).getTime() <= Date.now();
    await db.CustomerReward.update(reward.id, {
      status: expired ? 'expired' : 'applied',
      locked_at: '',
      ...(expired ? { applied_invoice_id: '', applied_at: '', released_at: now } : {}),
    });
  }
  return await db.Invoice.update(invoice.id, {
    checkout_attempt_id: '',
    stripe_checkout_session_id: '',
    checkout_started_at: '',
    reward_locked_at: '',
    ...(reward?.expires_at && new Date(reward.expires_at).getTime() <= Date.now() ? {
      amount: invoice.pre_reward_amount || invoice.amount,
      reward_id: '',
      reward_kind: '',
      reward_discount_amount: 0,
      reward_applied_at: '',
      reward_snapshot: {},
    } : {}),
  });
}

export async function settleInvoiceRewards(db: any, invoice: any, job: any, paidAt = new Date().toISOString()) {
  const customer = await resolveInvoiceCustomer(db, invoice, job);
  if (!customer) return { customer: null, issued: [] };
  const issued: any[] = [];

  if (invoice.reward_id) {
    const reward = await db.CustomerReward.get(invoice.reward_id).catch(() => null);
    if (reward && ['applied', 'locked'].includes(reward.status) && reward.applied_invoice_id === invoice.id) {
      await db.CustomerReward.update(reward.id, { status: 'redeemed', redeemed_at: paidAt });
    }
  }

  const isFirstPaidInvoice = !customer.first_paid_invoice_id;
  if (isFirstPaidInvoice) {
    await db.Customer.update(customer.id, {
      first_paid_invoice_id: invoice.id,
      first_paid_invoice_at: paidAt,
      referral_status: customer.referred_by_customer_id ? 'completed' : (customer.referral_status || 'none'),
    });
    if (customer.referred_by_customer_id) {
      const referrer = await db.Customer.get(customer.referred_by_customer_id).catch(() => null);
      if (referrer) {
        const result = await issueReward(db, {
          customer: referrer,
          source_customer_account_id: customer.id,
          source_job_id: job?.id || '',
          source_invoice_id: invoice.id,
          kind: 'referrer_discount',
          description: '10% off one future invoice after your referral completed their first repair',
          discount_type: 'percentage',
          value: 10,
          max_discount: 50,
          applies_to: 'all',
          valid_days: 90,
          issued_at: paidAt,
          idempotency_key: `referrer:${customer.id}:${invoice.id}`,
        });
        if (result.created) issued.push(result.reward);
      }
    }
  }

  if (new Date(paidAt).getTime() >= new Date(REWARDS_LAUNCH_AT).getTime()) {
    const stableId = customer.customer_id || invoice.customer_id || job?.customer_id || '';
    const paidInvoices = stableId
      ? await db.Invoice.filter({ customer_id: stableId, status: 'paid' }, '-paid_date', 500).catch(() => [])
      : [];
    if (!paidInvoices.some((row: any) => row.id === invoice.id)) paidInvoices.push({ ...invoice, status: 'paid', paid_date: paidAt });
    const distinctPaidJobs = new Set(paidInvoices
      .filter((row: any) => row.job_id && new Date(row.paid_date || row.updated_date || 0).getTime() >= new Date(REWARDS_LAUNCH_AT).getTime())
      .map((row: any) => row.job_id));
    const paidCount = distinctPaidJobs.size;
    const earnedMilestone = Math.floor(paidCount / 5);
    const recordedMilestone = Number(customer.loyalty_reward_milestone || 0);
    for (let milestone = recordedMilestone + 1; milestone <= earnedMilestone; milestone += 1) {
      const result = await issueReward(db, {
        customer,
        source_job_id: job?.id || '',
        source_invoice_id: invoice.id,
        kind: 'loyalty_labour_discount',
        description: '10% off labour after five paid repairs',
        discount_type: 'percentage',
        value: 10,
        max_discount: 50,
        applies_to: 'labour',
        valid_days: 180,
        issued_at: paidAt,
        idempotency_key: `loyalty:${customer.id}:${milestone}`,
        metadata: { milestone, paid_repair_count: paidCount },
      });
      if (result.created) issued.push(result.reward);
    }
    await db.Customer.update(customer.id, {
      loyalty_paid_repair_count: paidCount,
      loyalty_reward_milestone: Math.max(recordedMilestone, earnedMilestone),
    });
  }

  return { customer, issued };
}
