import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import {
  IdentityConflictError,
  contactFingerprintInput,
  isAdmin,
  isCustomer,
  normalizeAustralianMobile,
  normalizeEmail,
} from './identityPolicy.ts';

const encoder = new TextEncoder();

export async function sha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(value || '')));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytesLength = 32): string {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function authenticatedContext(req: Request) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  return { base44, user, entities: base44.asServiceRole.entities };
}

export async function requireAdminContext(req: Request) {
  const context = await authenticatedContext(req);
  if (!context.user) return { ...context, error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isAdmin(context.user)) return { ...context, error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  return context;
}

export async function findCanonicalCustomer(entities: any, userId: string) {
  if (!userId) return null;
  const customers = await entities.Customer.filter({ user_id: userId }, '-updated_date', 3).catch(() => []);
  if (customers.length > 1) {
    throw new IdentityConflictError('More than one Customer is linked to this user.', 'DUPLICATE_CUSTOMER_USER_ID');
  }
  const customer = customers[0] || null;
  const links = await entities.CustomerIdentityLink.filter({ user_id: userId }, '-linked_at', 3).catch(() => []);
  const active = links.filter((link: any) => link.status === 'active');
  if (active.length > 1) throw new IdentityConflictError('More than one active identity link exists.', 'DUPLICATE_IDENTITY_LINK');
  if (active[0] && customer && active[0].customer_account_id !== customer.id) {
    throw new IdentityConflictError('Customer and identity link ownership disagree.', 'IDENTITY_LINK_MISMATCH');
  }
  if (active[0] && !customer) {
    throw new IdentityConflictError('Identity link references a Customer that is not linked by user_id.', 'ORPHAN_IDENTITY_LINK');
  }
  return customer;
}

async function ensureIdentityLink(entities: any, userId: string, customerId: string, source: string, now: string) {
  const [byUser, byCustomer] = await Promise.all([
    entities.CustomerIdentityLink.filter({ user_id: userId }, '-linked_at', 3).catch(() => []),
    entities.CustomerIdentityLink.filter({ customer_account_id: customerId }, '-linked_at', 3).catch(() => []),
  ]);
  const userLink = byUser.find((link: any) => link.status === 'active');
  const customerLink = byCustomer.find((link: any) => link.status === 'active');
  if (userLink && userLink.customer_account_id !== customerId) throw new IdentityConflictError('User already owns another Customer.', 'USER_ALREADY_LINKED');
  if (customerLink && customerLink.user_id !== userId) throw new IdentityConflictError('Customer is already owned by another User.', 'CUSTOMER_ALREADY_LINKED');
  if (userLink) return userLink;
  const pending = byUser.find((link: any) => link.status === 'pending');
  if (pending) {
    try {
      return await entities.CustomerIdentityLink.update(pending.id, { customer_account_id: customerId, status: 'active', source, linked_at: now });
    } catch (error) {
      const retry = await entities.CustomerIdentityLink.filter({ user_id: userId }, '-linked_at', 3).catch(() => []);
      const active = retry.find((link: any) => link.status === 'active' && link.customer_account_id === customerId);
      if (active) return active;
      throw error;
    }
  }
  if (byUser.some((link: any) => link.status === 'revoked')) throw new IdentityConflictError('This identity link was revoked and requires admin review.', 'IDENTITY_LINK_REVOKED');
  try {
    return await entities.CustomerIdentityLink.create({ user_id: userId, customer_account_id: customerId, status: 'active', source, linked_at: now });
  } catch (error) {
    const retry = await entities.CustomerIdentityLink.filter({ user_id: userId }, '-linked_at', 3).catch(() => []);
    const existing = retry.find((link: any) => link.status === 'active' && link.customer_account_id === customerId);
    if (existing) return existing;
    throw error;
  }
}

export async function ensureCanonicalCustomer(entities: any, user: any, profile: any = {}, source = 'authenticated_signup') {
  if (!isCustomer(user)) throw new IdentityConflictError('Only customer-role users may own Customer accounts.', 'ROLE_NOT_CUSTOMER');
  let customer = await findCanonicalCustomer(entities, user.id);
  const now = new Date().toISOString();
  if (!customer) {
    const completedPhoneUses = await entities.PhoneVerificationUse.filter(
      { user_id: user.id, status: 'completed' },
      '-completed_at',
      2,
    ).catch(() => []);
    if (!completedPhoneUses[0]) {
      throw new IdentityConflictError(
        'Verify your mobile number before creating a customer account.',
        'PHONE_VERIFICATION_REQUIRED',
      );
    }
    let reservation: any;
    try {
      reservation = await entities.CustomerIdentityLink.create({ user_id: user.id, customer_account_id: `pending:${user.id}`, status: 'pending', source, linked_at: now });
    } catch (error) {
      const links = await entities.CustomerIdentityLink.filter({ user_id: user.id }, '-linked_at', 3).catch(() => []);
      const active = links.find((link: any) => link.status === 'active');
      if (active) {
        const linkedCustomer = await entities.Customer.get(active.customer_account_id).catch(() => null);
        if (linkedCustomer?.user_id === user.id) return linkedCustomer;
      }
      throw new IdentityConflictError('Customer account bootstrap is already in progress or requires review.', 'IDENTITY_BOOTSTRAP_IN_PROGRESS');
    }
    const customerId = `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const name = String(profile.full_name || profile.display_name || user.full_name || user.email || 'Customer').trim();
    const email = normalizeEmail(user.email);
    const phone = normalizeAustralianMobile(profile.phone_e164 || profile.phone || user.phone);
    try {
      customer = await entities.Customer.create({
        customer_id: customerId,
        user_id: user.id,
        name,
        full_name: name,
        email,
        phone,
        phone_e164: phone,
        phone_display: phone,
        status: 'active',
        tags: ['customer'],
        identity_version: 2,
        identity_linked_at: now,
        identity_link_source: source,
        createdAt: now,
        last_activity_date: now,
      });
      await entities.CustomerIdentityLink.update(reservation.id, { customer_account_id: customer.id, status: 'active', source, linked_at: now });
    } catch (error) {
      customer = await findCanonicalCustomer(entities, user.id);
      if (!customer) {
        await entities.CustomerIdentityLink.delete(reservation.id).catch(() => null);
        throw error;
      }
    }
  }
  await ensureIdentityLink(entities, user.id, customer.id, source, now);
  return customer;
}

export async function requireCustomerContext(req: Request, options: { create?: boolean; profile?: any } = {}) {
  const context = await authenticatedContext(req);
  if (!context.user) return { ...context, error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isCustomer(context.user)) return { ...context, error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  const customer = options.create
    ? await ensureCanonicalCustomer(context.entities, context.user, options.profile || {})
    : await findCanonicalCustomer(context.entities, context.user.id);
  if (!customer) return { ...context, error: Response.json({ error: 'Customer account not found' }, { status: 404 }) };
  return { ...context, customer };
}

export async function contactHash(email: unknown, phone: unknown): Promise<string> {
  return sha256(contactFingerprintInput(email, phone));
}

export async function reserveVerificationProof(entities: any, options: any) {
  const challengeId = String(options.challengeId || '').trim();
  const proof = String(options.proof || '').trim();
  const operationId = String(options.operationId || '').trim();
  if (!challengeId || !proof || !operationId) throw new IdentityConflictError('Verification proof is required.', 'VERIFICATION_REQUIRED');

  const records = await entities.ContactVerificationChallenge.filter({ challenge_id: challengeId }, '-created_date', 2).catch(() => []);
  if (records.length !== 1) throw new IdentityConflictError('Verification challenge is invalid.', 'VERIFICATION_INVALID');
  const challenge = records[0];
  const proofExpires = new Date(challenge.proof_expires_at || 0).getTime();
  if (challenge.purpose !== options.purpose || !proofExpires || proofExpires <= Date.now()) {
    throw new IdentityConflictError('Verification challenge is expired or unavailable.', 'VERIFICATION_EXPIRED');
  }
  if (await sha256(proof) !== challenge.proof_hash) throw new IdentityConflictError('Verification proof is invalid.', 'VERIFICATION_INVALID');
  if (options.email !== undefined && options.phone !== undefined && await contactHash(options.email, options.phone) !== challenge.contact_hash) {
    throw new IdentityConflictError('Verified contact details do not match this request.', 'CONTACT_MISMATCH');
  }
  if (options.expectedContactHash && challenge.contact_hash !== options.expectedContactHash) {
    throw new IdentityConflictError('Verification does not match this booking.', 'CONTACT_MISMATCH');
  }

  const existingUses = await entities.VerificationUse.filter({ challenge_id: challengeId }, '-created_date', 1).catch(() => []);
  if (existingUses[0]) {
    if (existingUses[0].operation_id === operationId) return { challenge, use: existingUses[0], replay: true };
    throw new IdentityConflictError('Verification proof has already been used.', 'VERIFICATION_ALREADY_USED');
  }
  if (challenge.status !== 'verified') throw new IdentityConflictError('Verification challenge is unavailable.', 'VERIFICATION_ALREADY_USED');

  const reservedAt = new Date().toISOString();
  try {
    const use = await entities.VerificationUse.create({ challenge_id: challengeId, operation_id: operationId, purpose: options.purpose, status: 'reserved', reserved_at: reservedAt });
    return { challenge, use, replay: false };
  } catch (error) {
    const existing = await entities.VerificationUse.filter({ challenge_id: challengeId }, '-created_date', 1).catch(() => []);
    if (existing[0]?.operation_id === operationId) return { challenge, use: existing[0], replay: true };
    throw new IdentityConflictError('Verification proof has already been used.', 'VERIFICATION_ALREADY_USED');
  }
}

export async function completeVerificationUse(entities: any, challenge: any, use: any, subjectType: string, subjectId: string) {
  const now = new Date().toISOString();
  await entities.VerificationUse.update(use.id, { status: 'completed', subject_type: subjectType, subject_id: subjectId, completed_at: now });
  await entities.ContactVerificationChallenge.update(challenge.id, { status: 'consumed', consumed_at: now, consumed_by_operation_id: use.operation_id, job_id: subjectType === 'Job' ? subjectId : challenge.job_id || '' });
}

export async function revokeGuestGrants(entities: any, jobId: string, reason = 'job_claimed') {
  const [camel, snake] = await Promise.all([
    entities.PublicJobAccess.filter({ jobId }, '-created_date', 100).catch(() => []),
    entities.PublicJobAccess.filter({ job_id: jobId }, '-created_date', 100).catch(() => []),
  ]);
  const grants = [...new Map([...camel, ...snake].map((grant: any) => [grant.id, grant])).values()];
  const now = new Date().toISOString();
  await Promise.all(grants.filter((grant: any) => !grant.revokedAt && !grant.revoked_at).map((grant: any) => entities.PublicJobAccess.update(grant.id, { revokedAt: now, revoked_at: now, revocation_reason: reason })));
  return { revoked: grants.filter((grant: any) => !grant.revokedAt && !grant.revoked_at).length, revokedAt: now };
}
