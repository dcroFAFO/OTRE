import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import {
  completeVerificationUse,
  ensureCanonicalCustomer,
  findCanonicalCustomer,
  reserveVerificationProof,
  revokeGuestGrants,
} from '../../shared/identityAuth.ts';
import { customerAccountDto, isCustomer } from '../../shared/identityPolicy.ts';

function parseCredential(payload: any) {
  const explicitChallenge = String(payload.challenge_id || '').trim();
  const explicitProof = String(payload.verification_proof || '').trim();
  if (explicitChallenge && explicitProof) return { challengeId: explicitChallenge, proof: explicitProof };
  const opaque = String(payload.verification_id || '').trim();
  const separator = opaque.indexOf('.');
  if (separator < 1) return { challengeId: '', proof: '' };
  return { challengeId: opaque.slice(0, separator), proof: opaque.slice(separator + 1) };
}

async function claimGuestJob(entities: any, user: any, customer: any, payload: any) {
  const jobId = String(payload.job_id || '').trim();
  if (!jobId) return { error: Response.json({ error: 'job_id is required' }, { status: 400 }) };
  const job = await entities.Job.get(jobId).catch(() => null);
  if (!job) return { error: Response.json({ error: 'Job not found' }, { status: 404 }) };
  if (job.customer_account_id || job.claim_status === 'claimed' || job.claimed_by_customer) {
    if (job.customer_account_id === customer.id) {
      await revokeGuestGrants(entities, job.id, 'job_claimed');
      return { customer, job, alreadyClaimed: true };
    }
    return { error: Response.json({ error: 'This job has already been claimed.' }, { status: 409 }) };
  }
  if (!job.verified_contact_hash || !job.contact_verification_id) {
    return { error: Response.json({ error: 'This legacy job cannot be self-claimed. Contact support for a reviewed migration.' }, { status: 409 }) };
  }

  const credential = parseCredential(payload);
  const operationId = `guest-claim:${job.id}:${credential.challengeId}`;
  const reservation = await reserveVerificationProof(entities, {
    ...credential,
    operationId,
    purpose: 'guest_claim',
    expectedContactHash: job.verified_contact_hash,
  });
  if (reservation.challenge.job_id !== job.id) {
    return { error: Response.json({ error: 'Verification does not match this job.' }, { status: 403 }) };
  }
  if (reservation.replay) {
    const existing = await entities.BookingClaim.filter({ job_id: job.id }, '-claimed_at', 1).catch(() => []);
    if (existing[0]?.user_id === user.id) {
      const now = new Date().toISOString();
      const reconciledJob = await entities.Job.update(job.id, {
        customer_account_id: customer.id,
        customer_user_id: user.id,
        customer_id: customer.customer_id || customer.id,
        customerId: customer.customer_id || customer.id,
        claimed_by_customer: true,
        claim_status: 'claimed',
        claimed_at: existing[0].claimed_at || now,
        updatedAt: now,
      });
      const grants = await revokeGuestGrants(entities, job.id, 'job_claimed');
      if (reservation.use.status !== 'completed') await completeVerificationUse(entities, reservation.challenge, reservation.use, 'BookingClaim', existing[0].id);
      await entities.BookingClaim.update(existing[0].id, { guest_grants_revoked_at: grants.revokedAt });
      return { customer, job: reconciledJob, alreadyClaimed: true };
    }
    return { error: Response.json({ error: 'This verification proof has already been used.' }, { status: 409 }) };
  }

  const now = new Date().toISOString();
  let claim;
  try {
    claim = await entities.BookingClaim.create({
      job_id: job.id,
      customer_account_id: customer.id,
      user_id: user.id,
      verification_use_id: reservation.use.id,
      verified_channel: reservation.challenge.channel,
      claimed_at: now,
      status: 'completed',
    });
  } catch (error) {
    const existing = await entities.BookingClaim.filter({ job_id: job.id }, '-claimed_at', 1).catch(() => []);
    if (existing[0]?.user_id !== user.id) throw error;
    claim = existing[0];
  }

  const updatedJob = await entities.Job.update(job.id, {
    customer_account_id: customer.id,
    customer_user_id: user.id,
    customer_id: customer.customer_id || customer.id,
    customerId: customer.customer_id || customer.id,
    customer_profile_id: '',
    claimed_by_customer: true,
    claim_status: 'claimed',
    claimed_at: now,
    updatedAt: now,
  });
  const grantResult = await revokeGuestGrants(entities, job.id, 'job_claimed');
  await entities.BookingClaim.update(claim.id, { guest_grants_revoked_at: grantResult.revokedAt });
  await completeVerificationUse(entities, reservation.challenge, reservation.use, 'BookingClaim', claim.id);
  await entities.Customer.update(customer.id, { last_activity_date: now }).catch(() => null);
  await entities.AuditEvent.create({
    event_type: 'guest_job_claimed',
    job_id: job.id,
    customer_id: customer.customer_id || customer.id,
    customer_account_id: customer.id,
    actor_id: user.id,
    actor_name: user.full_name || user.email || 'Customer',
    actor_role: 'customer',
    outcome: 'succeeded',
    summary: `Guest booking ${job.reference || job.id} claimed by authenticated customer`,
    visibility: 'internal',
    metadata: { identity_version: 2, verified_channel: reservation.challenge.channel, guest_grants_revoked: grantResult.revoked },
  }).catch(() => null);
  return { customer, job: updatedJob, alreadyClaimed: false };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isCustomer(user)) return Response.json({ error: 'Customer account required' }, { status: 403 });
    const payload = await req.json().catch(() => ({}));
    const profile = payload.profile || {};
    const entities = base44.asServiceRole.entities;
    const existingCustomer = await findCanonicalCustomer(entities, user.id);
    if (!existingCustomer) {
      const completedPhoneUses = await entities.PhoneVerificationUse.filter(
        { user_id: user.id, status: 'completed' },
        '-completed_at',
        2,
      ).catch(() => []);
      if (!completedPhoneUses[0]) {
        return Response.json({
          error: 'Verify your mobile number before creating a customer account.',
          code: 'PHONE_VERIFICATION_REQUIRED',
        }, { status: 403 });
      }
    }
    const customer = existingCustomer || await ensureCanonicalCustomer(
      entities,
      user,
      profile,
      'authenticated_signup',
    );

    if (payload.action === 'claimGuestJob' || payload.job_id) {
      const result = await claimGuestJob(entities, user, customer, payload);
      if (result.error) return result.error;
      return Response.json({
        linked: result.alreadyClaimed ? 0 : 1,
        claimed: !result.alreadyClaimed,
        job_id: result.job.id,
        customer_account: customerAccountDto(result.customer, user),
      });
    }

    // Backwards-compatible bootstrap action used after login/registration. It
    // creates only the caller's canonical account and never searches or claims
    // jobs by email, phone, or mutable User fields.
    return Response.json({ linked: 0, customer_account: customerAccountDto(customer, user) });
  } catch (error) {
    const status = String(error?.code || '').includes('CONFLICT') || String(error?.code || '').includes('LINK') ? 409 : 500;
    console.error('[claimCustomerJobs] failed', JSON.stringify({ code: error?.code || '', message: error?.message || String(error) }));
    return Response.json({ error: status === 409 ? 'Your account has an identity conflict that requires support review.' : 'Your customer account could not be prepared. Please try again.' }, { status });
  }
});
