import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  calculateRewardDiscount,
  expireAvailableRewards,
  issueReward,
  settleInvoiceRewards,
} from '../../shared/rewardLifecycle.ts';

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function resolveCustomer(db: any, user: any) {
  if (user.customer_account_id) {
    const direct = await db.Customer.get(user.customer_account_id).catch(() => null);
    if (direct) return direct;
  }
  let rows = await db.Customer.filter({ user_id: user.id }, '-updated_date', 1).catch(() => []);
  if (rows[0]) return rows[0];
  const email = normalizeEmail(user.email);
  rows = email ? await db.Customer.filter({ email }, '-updated_date', 1).catch(() => []) : [];
  return rows[0] || null;
}

async function resolveOwnedInvoice(db: any, customer: any, invoiceId: string) {
  const invoice = await db.Invoice.get(invoiceId).catch(() => null);
  if (!invoice) return { error: 'Invoice not found.', status: 404 };
  const job = invoice.job_id ? await db.Job.get(invoice.job_id).catch(() => null) : null;
  const stableIds = new Set([customer.id, customer.customer_id].filter(Boolean));
  const owned = job?.customer_account_id === customer.id || stableIds.has(invoice.customer_id) || stableIds.has(job?.customer_id);
  if (!owned) return { error: 'You do not have access to this invoice.', status: 403 };
  if (invoice.invoiceVisibility !== 'customer_visible') return { error: 'This invoice is not available.', status: 403 };
  return { invoice, job };
}

async function sendRewardEmail(db: any, customer: any, invoice: any, action: string) {
  const email = normalizeEmail(customer.email);
  if (!email) return false;
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return false;
  const businessRows = await db.BusinessProfile.list('-updated_date', 1).catch(() => []);
  const business = businessRows[0] || {};
  const from = Deno.env.get('INVOICE_FROM_EMAIL') || business.invoice_sender_email || business.email || 'info@ontherunelectrics.com.au';
  const label = invoice.number ? `Invoice ${escapeHtml(invoice.number)}` : 'Your invoice';
  const amount = `${escapeHtml(invoice.currency || 'AUD')} ${Number(invoice.amount || 0).toFixed(2)}`;
  const subject = action === 'applied' ? `${label} updated with your reward` : `${label} reward removed`;
  const body = action === 'applied'
    ? `Your selected reward has been applied. The revised amount is <strong>${amount}</strong>.`
    : `Your selected reward has been removed. The revised amount is <strong>${amount}</strong>.`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${business.name || 'On The Run Electrics'} <${from}>`,
      to: [email],
      subject,
      html: `<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.6"><p>Hi ${escapeHtml(customer.full_name || customer.name || 'there')},</p><p>${body}</p><p>Sign in to My Account to review the revised invoice before payment.</p><p style="color:#64748b;font-size:13px">Your reward is only redeemed after the invoice is settled.</p></div>`,
    }),
  }).catch(() => null);
  return !!response?.ok;
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in to manage rewards.' }, { status: 401 });
    if (STAFF_ROLES.has(String(user.role || '').toLowerCase()) || user.is_customer === false || user.data?.is_customer === false) {
      return Response.json({ error: 'Rewards are managed from a customer account.' }, { status: 403 });
    }
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'list');
    const customer = await resolveCustomer(db, user);
    if (!customer) return Response.json({ error: 'Finish creating your customer profile before using rewards.' }, { status: 409 });

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
      const code = String(body.code || '').trim().toUpperCase();
      if (!/^OTR-[A-Z0-9-]{4,20}$/.test(code)) return Response.json({ error: 'Enter a valid referral code.' }, { status: 400 });
      if (customer.referred_by_customer_id || customer.referral_claimed_at) return Response.json({ error: 'A referral code has already been claimed for this account.' }, { status: 409 });
      const referrers = await db.Customer.filter({ referral_code: code }, '-created_date', 2).catch(() => []);
      const referrer = referrers[0] || null;
      if (!referrer) return Response.json({ error: 'This referral code is invalid or has expired.' }, { status: 404 });
      if (referrer.id === customer.id || (referrer.user_id && referrer.user_id === user.id)) return Response.json({ error: 'You cannot use your own referral code.' }, { status: 400 });

      const [byUser, byAccount, byEmail] = await Promise.all([
        db.Job.filter({ customer_user_id: user.id }, '-created_date', 1).catch(() => []),
        db.Job.filter({ customer_account_id: customer.id }, '-created_date', 1).catch(() => []),
        customer.email ? db.Job.filter({ customer_email: normalizeEmail(customer.email) }, '-created_date', 1).catch(() => []) : [],
      ]);
      if (byUser.length || byAccount.length || byEmail.length || customer.first_paid_invoice_id) {
        return Response.json({ error: 'Referral codes must be claimed before your first booking.' }, { status: 409 });
      }
      const createdAt = new Date(customer.createdAt || customer.created_date || 0).getTime();
      if (createdAt && Date.now() - createdAt > 24 * 60 * 60 * 1000) {
        return Response.json({ error: 'Referral codes can only be claimed while creating a new account.' }, { status: 409 });
      }

      const now = new Date().toISOString();
      await db.Customer.update(customer.id, {
        referred_by_customer_id: referrer.id,
        referral_source_code: code,
        referral_claimed_at: now,
        referral_status: 'pending',
        referral_eligible: true,
      });
      const result = await issueReward(db, {
        customer: { ...customer, user_id: customer.user_id || user.id },
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
      return Response.json({ claimed: true, reward: rewardPayload(result.reward) });
    }

    if (action === 'apply') {
      const owned = await resolveOwnedInvoice(db, customer, String(body.invoice_id || ''));
      if (owned.error) return Response.json({ error: owned.error }, { status: owned.status });
      const { invoice, job } = owned;
      if (['paid', 'refunded', 'cancelled', 'void'].includes(invoice.status)) return Response.json({ error: 'Rewards cannot be changed on this invoice.' }, { status: 409 });
      if (invoice.checkout_started_at) return Response.json({ error: 'This invoice is already in checkout, so its reward can no longer be changed.' }, { status: 409 });
      if (invoice.reward_id && invoice.reward_id !== body.reward_id) return Response.json({ error: 'Remove the current reward before selecting another.' }, { status: 409 });
      const reward = await db.CustomerReward.get(String(body.reward_id || '')).catch(() => null);
      if (!reward || reward.customer_account_id !== customer.id) return Response.json({ error: 'Reward not found.' }, { status: 404 });
      if (invoice.reward_id === reward.id && reward.applied_invoice_id === invoice.id) return Response.json({ invoice, reward: rewardPayload(reward) });
      if (reward.status !== 'available') return Response.json({ error: 'This reward is no longer available.' }, { status: 409 });
      if (reward.expires_at && new Date(reward.expires_at).getTime() <= Date.now()) {
        await db.CustomerReward.update(reward.id, { status: 'expired' }).catch(() => null);
        return Response.json({ error: 'This reward has expired.' }, { status: 409 });
      }
      if (reward.applies_to === 'first_invoice' && customer.first_paid_invoice_id) return Response.json({ error: 'This first-invoice reward is no longer eligible.' }, { status: 409 });
      const calculation = calculateRewardDiscount(reward, invoice);
      if (calculation.discount <= 0) {
        return Response.json({ error: reward.applies_to === 'labour' ? 'This invoice has no eligible labour amount.' : 'This reward is not eligible for this invoice.' }, { status: 409 });
      }
      const now = new Date().toISOString();
      await db.CustomerReward.update(reward.id, { status: 'applied', applied_invoice_id: invoice.id, applied_at: now });
      let updated;
      try {
        updated = await db.Invoice.update(invoice.id, {
          pre_reward_amount: calculation.baseAmount,
          amount: Math.max(0, Math.round((calculation.baseAmount - calculation.discount) * 100) / 100),
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
      if (Number(updated.amount || 0) === 0) {
        const paidAt = new Date().toISOString();
        updated = await db.Invoice.update(updated.id, { status: 'paid', paid_date: paidAt, payment_method: 'reward' });
        if (job) await db.Job.update(job.id, { payment_status: 'paid', status: 'completed' });
        await settleInvoiceRewards(db, updated, job, paidAt);
      }
      await sendRewardEmail(db, customer, updated, 'applied').catch(() => false);
      return Response.json({ invoice: updated, reward: rewardPayload({ ...reward, status: Number(updated.amount || 0) === 0 ? 'redeemed' : 'applied' }) });
    }

    if (action === 'remove') {
      const owned = await resolveOwnedInvoice(db, customer, String(body.invoice_id || ''));
      if (owned.error) return Response.json({ error: owned.error }, { status: owned.status });
      const { invoice } = owned;
      if (!invoice.reward_id) return Response.json({ invoice, removed: false });
      if (invoice.checkout_started_at || invoice.status === 'paid') return Response.json({ error: 'This reward can no longer be removed after checkout starts.' }, { status: 409 });
      const reward = await db.CustomerReward.get(invoice.reward_id).catch(() => null);
      if (!reward || reward.customer_account_id !== customer.id || reward.applied_invoice_id !== invoice.id) return Response.json({ error: 'Applied reward not found.' }, { status: 404 });
      const restoredAmount = Number(invoice.pre_reward_amount || (Number(invoice.amount || 0) + Number(invoice.reward_discount_amount || 0)));
      const updated = await db.Invoice.update(invoice.id, {
        amount: Math.max(0, Math.round(restoredAmount * 100) / 100),
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
      await sendRewardEmail(db, customer, updated, 'removed').catch(() => false);
      return Response.json({ invoice: updated, removed: true });
    }

    return Response.json({ error: 'Unknown reward action.' }, { status: 400 });
  } catch (error) {
    console.error('[customerRewards] failed', error.message, error.stack);
    return Response.json({ error: 'Rewards could not be updated. Please try again.' }, { status: 500 });
  }
});
