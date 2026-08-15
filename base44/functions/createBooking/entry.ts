import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import { checkRateLimit, clientIpThrottle } from '../../shared/rateLimit.ts';
import { mintJobReference } from '../../shared/jobReference.ts';
import { addIdList, scooterMatches } from '../../shared/customerCore.ts';
import {
  completeVerificationUse,
  contactHash,
  ensureCanonicalCustomer,
  randomToken,
  reserveVerificationProof,
  sha256,
} from '../../shared/identityAuth.ts';
import { isAdmin, isCustomer, normalizeAustralianMobile, normalizeEmail } from '../../shared/identityPolicy.ts';

const SLUG = 'otr-scooters';
const MAX_BOOKINGS_PER_IP = 5;
const MAX_GLOBAL_BOOKINGS = 300;
const MAX_BOOKINGS_PER_EMAIL = 3;
const INTAKE_STATUS = 'requested';
const DEFAULT_PERMISSIONS = ['view_status', 'view_booking', 'add_note', 'upload_file', 'view_invoice'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FALLBACK_PHONE = '0415 505 908';

function bookingMake(form: any) {
  return form.scooterMake || form.scooterBrand || (form.asset_make === 'Other' ? form.asset_custom_make : form.asset_make) || '';
}

function bookingModel(form: any) {
  return form.scooterModel || (form.asset_model === 'Other' ? form.asset_custom_model : form.asset_model) || '';
}

function classifyServiceType(text = '') {
  const value = String(text).toLowerCase();
  if (/puncture|tyre|tire|tube/.test(value)) return 'puncture_tyres';
  if (/brake|rotor|pad/.test(value)) return 'brakes';
  if (/battery|range|charging|charger|charge/.test(value)) return 'battery';
  if (/controller|error code|fault code/.test(value)) return 'controller_electronics';
  if (/display|dashboard|screen/.test(value)) return 'display_dashboard';
  if (/throttle/.test(value)) return 'throttle';
  if (/wiring|cable|connector/.test(value)) return 'wiring';
  if (/water|rain|corrosion/.test(value)) return 'water_damage';
  if (/service|maintenance/.test(value)) return 'service_maintenance';
  if (/diagnostic|diagnosis|inspect|assessment/.test(value)) return 'diagnostic';
  if (/warranty/.test(value)) return 'warranty';
  if (/custom|modify|modification/.test(value)) return 'custom_work';
  return 'general_repair';
}

function bookingSnapshot(form: any, email: string, phone: string, name: string) {
  const make = bookingMake(form);
  const model = bookingModel(form);
  const issueText = [form.issue_description, form.serviceRequested, form.issue_type].filter(Boolean).join(' ');
  return {
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    customerPhoneE164: phone,
    phoneCountryCode: '+61',
    scooterIssueSummary: String(form.scooter_issue_summary || '').slice(0, 1000),
    scooterMakeModel: String(form.scooter_make_model || '').slice(0, 240),
    rideableStatus: String(form.rideable_status || '').slice(0, 80),
    urgencyOrSafetyNotes: String(form.urgency_or_safety_notes || '').slice(0, 2000),
    suspectedServiceCategory: String(form.suspected_service_category || '').slice(0, 120),
    scooterMake: String(make).slice(0, 120),
    scooterBrand: String(make).slice(0, 120),
    scooterModel: String(model).slice(0, 120),
    serial_number: String(form.serial_number || form.serialNumber || '').slice(0, 160),
    colour: String(form.colour || form.color || '').slice(0, 80),
    assetLabel: String(form.asset_label || [make, model].filter(Boolean).join(' ')).slice(0, 240),
    issueOrService: String(form.issue_description || form.serviceRequested || '').slice(0, 4000),
    issueDescription: String(form.issue_description || '').slice(0, 4000),
    serviceRequested: String(form.serviceRequested || form.issue_type || '').slice(0, 240),
    serviceType: form.service_type || classifyServiceType(issueText),
    preferredDate: form.preferred_date || form.preferredDate || '',
    preferredTimeWindow: String(form.preferred_time_window || form.preferredTimeWindow || '').slice(0, 120),
    isRideable: typeof form.rideable === 'boolean' ? form.rideable : form.isRideable,
    asap: !!form.asap,
    photos: [],
    files: [],
    submittedAt: new Date().toISOString(),
  };
}

async function currentUser(base44: any) {
  try { return await base44.auth.me(); } catch { return null; }
}

async function getBusinessPhone(base44: any) {
  const profiles = await base44.asServiceRole.entities.BusinessProfile.filter({ is_default: true }, '-updated_date', 1).catch(() => []);
  const profile = profiles[0] || (await base44.asServiceRole.entities.BusinessProfile.list('-updated_date', 1).catch(() => []))[0];
  return String(profile?.phone_display || profile?.phone || FALLBACK_PHONE).trim() || FALLBACK_PHONE;
}

function parseVerificationCredential(form: any) {
  const explicitChallenge = String(form.challenge_id || '').trim();
  const explicitProof = String(form.verification_proof || '').trim();
  if (explicitChallenge && explicitProof) return { challengeId: explicitChallenge, proof: explicitProof };
  const opaque = String(form.verification_id || '').trim();
  const separator = opaque.indexOf('.');
  if (separator < 1) return { challengeId: '', proof: '' };
  return { challengeId: opaque.slice(0, separator), proof: opaque.slice(separator + 1) };
}

async function resolveBookingScooter(entities: any, customer: any, booking: any) {
  const stableId = customer.customer_id || customer.id;
  const data = {
    make: booking.scooterMake || booking.scooterBrand || '', model: booking.scooterModel || '',
    serial_number: booking.serial_number || '', colour: booking.colour || '', color: booking.colour || '',
    notes: booking.urgencyOrSafetyNotes || booking.issueOrService || '',
  };
  if (!data.make && !data.model && !data.serial_number) return null;
  const [byStable, byAccount] = await Promise.all([
    entities.Scooter.filter({ customer_id: stableId }, '-updated_date', 100).catch(() => []),
    entities.Scooter.filter({ customer_account_id: customer.id }, '-updated_date', 100).catch(() => []),
  ]);
  const existing = [...new Map([...byStable, ...byAccount].map((s: any) => [s.id, s])).values()].find((s: any) => scooterMatches(s, data));
  if (existing) return await entities.Scooter.update(existing.id, { customer_id: stableId, customer_account_id: customer.id });
  return await entities.Scooter.create({ ...data, customer_id: stableId, customer_account_id: customer.id });
}

function responseFor(job: any, rawToken: string | null, customer: any, scooter: any, email: string, duplicate = false) {
  const managePath = customer ? '/portal' : null;
  const accountPath = `/register?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/profile-setup?next=%2Fportal%3Fbook%3D1')}&customerFlow=1`;
  return {
    reference: job.reference,
    managePath,
    accountPath,
    trackingPath: rawToken ? `/track/${encodeURIComponent(rawToken)}` : null,
    job_id: job.id,
    customer_profile_id: '',
    customer_account_id: customer?.id || '',
    asset_id: scooter?.id || job.asset_id || '',
    linked: !!customer,
    duplicate,
  };
}

async function ensureGuestGrant(entities: any, job: any, rawToken: string, now = new Date().toISOString()) {
  if (!rawToken || job.customer_account_id || job.claim_status === 'claimed') return null;
  const tokenHash = await sha256(rawToken);
  const existing = await entities.PublicJobAccess.filter({ tokenHash }, '-created_date', 2).catch(() => []);
  if (existing[0]) {
    if ((existing[0].jobId || existing[0].job_id) !== job.id) throw new Error('Tracking token collision detected.');
    return existing[0];
  }
  try {
    return await entities.PublicJobAccess.create({ jobId: job.id, job_id: job.id, tokenHash, token_hash: tokenHash, permissions: DEFAULT_PERMISSIONS, expires_after_completion_days: 30, createdAt: now });
  } catch (error) {
    const retry = await entities.PublicJobAccess.filter({ tokenHash }, '-created_date', 2).catch(() => []);
    if (retry[0] && (retry[0].jobId || retry[0].job_id) === job.id) return retry[0];
    throw error;
  }
}

Deno.serve(async (req) => {
  let businessPhone = FALLBACK_PHONE;
  let reserved: any = null;
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const entities = base44.asServiceRole.entities;
    const form = await req.json().catch(() => ({}));
    const user = await currentUser(base44);
    if (isAdmin(user)) return Response.json({ error: 'Admin accounts must create jobs from the staff workflow.' }, { status: 403 });

    const authenticatedCustomer = isCustomer(user);
    const submittedEmail = normalizeEmail(form.customer_email || form.customerEmail);
    const email = authenticatedCustomer ? normalizeEmail(user.email) : submittedEmail;
    const phone = normalizeAustralianMobile(form.phone_e164 || form.customer_phone_e164 || form.phone);
    const name = String((authenticatedCustomer && user.full_name) || form.customer_name || form.customerName || '').trim().slice(0, 160);
    const assetLabel = String(form.asset_label || '').trim();
    const issue = String(form.issue_description || '').trim();
    if (!name || !email || !phone || !assetLabel || !issue) return Response.json({ error: 'Name, email, phone, scooter details and issue description are required.' }, { status: 400 });
    if (!EMAIL_PATTERN.test(email)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
    if (!phone) return Response.json({ error: 'Enter a valid Australian mobile number.' }, { status: 400 });
    businessPhone = await getBusinessPhone(base44);

    const ipThrottle = clientIpThrottle(req, MAX_BOOKINGS_PER_IP, MAX_GLOBAL_BOOKINGS);
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit(base44, `booking:ip:${ipThrottle.key}`, ipThrottle.limit),
      checkRateLimit(base44, `booking:email:${email}`, MAX_BOOKINGS_PER_EMAIL),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) return Response.json({ error: `You've submitted several booking requests just now. Please wait or call us on ${businessPhone}.` }, { status: 429 });

    let customer = null;
    let verifiedChallenge = null;
    let verificationUse = null;
    let rawToken: string | null = null;
    if (authenticatedCustomer) {
      customer = await ensureCanonicalCustomer(entities, user, { full_name: name, phone_e164: phone }, 'authenticated_signup');
    } else {
      const credential = parseVerificationCredential(form);
      const operationId = credential.challengeId ? `guest-booking:${credential.challengeId}` : '';
      reserved = await reserveVerificationProof(entities, {
        ...credential,
        operationId,
        purpose: 'guest_booking',
        email,
        phone,
      });
      verifiedChallenge = reserved.challenge;
      verificationUse = reserved.use;
      rawToken = await sha256(`guest-tracking:${credential.challengeId}:${credential.proof}`);
      if (reserved.replay && verificationUse.status === 'failed' && verifiedChallenge.status === 'verified') {
        verificationUse = await entities.VerificationUse.update(verificationUse.id, { status: 'reserved', failure_code: '' });
        reserved = { ...reserved, use: verificationUse, replay: false };
      }
      if (reserved.replay) {
        if (verificationUse.status !== 'completed' || !verificationUse.subject_id) {
          const recoverable = await entities.Job.filter({ contact_verification_id: verifiedChallenge.id }, '-created_date', 2).catch(() => []);
          if (recoverable.length === 1 && recoverable[0].verified_contact_hash === verifiedChallenge.contact_hash) {
            await completeVerificationUse(entities, verifiedChallenge, verificationUse, 'Job', recoverable[0].id);
            await ensureGuestGrant(entities, recoverable[0], rawToken);
            return Response.json(responseFor(recoverable[0], recoverable[0].claim_status === 'claimed' ? null : rawToken, null, null, email, true));
          }
          return Response.json({ error: recoverable.length > 1 ? 'This booking requires support review.' : 'This verified booking submission is already being processed.' }, { status: 409 });
        }
        const existing = await entities.Job.get(verificationUse.subject_id).catch(() => null);
        if (!existing) return Response.json({ error: 'The previous booking result could not be recovered. Please contact support.' }, { status: 409 });
        await ensureGuestGrant(entities, existing, rawToken);
        return Response.json(responseFor(existing, existing.claim_status === 'claimed' ? null : rawToken, null, null, email, true));
      }
    }

    const now = new Date().toISOString();
    const submitted = bookingSnapshot(form, email, phone, name);
    const scooter = customer ? await resolveBookingScooter(entities, customer, submitted) : null;
    const resolvedAssetLabel = scooter ? [scooter.make, scooter.model].filter(Boolean).join(' ') : submitted.assetLabel;
    const reference = await mintJobReference(entities);
    const stableCustomerId = customer?.customer_id || '';
    const fingerprint = authenticatedCustomer ? '' : await contactHash(email, phone);
    const intake = {
      customerName: name, customerEmail: email, customerPhone: phone, customerPhoneE164: phone,
      scooterMake: submitted.scooterMake, scooterModel: submitted.scooterModel, make: submitted.scooterMake,
      model: submitted.scooterModel, serial_number: submitted.serial_number, issueOrService: submitted.issueOrService,
      initial_issue_notes: [submitted.issueOrService, submitted.urgencyOrSafetyNotes].filter(Boolean).join('\n'),
      service_type: submitted.serviceType, date: submitted.preferredDate, isRideable: submitted.isRideable,
      booking_files: submitted.files,
    };

    const job = await entities.Job.create({
      reference,
      customer_profile_id: '',
      customer_user_id: customer ? user.id : '',
      customerId: stableCustomerId,
      customer_id: stableCustomerId,
      customer_account_id: customer?.id || '',
      claimed_by_customer: !!customer,
      claim_status: customer ? 'claimed' : 'unclaimed',
      claimed_at: customer ? now : undefined,
      contact_verification_id: verifiedChallenge?.id || '',
      verified_contact_channel: verifiedChallenge?.channel || undefined,
      verified_contact_hash: fingerprint,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      customer_phone_e164: phone,
      customer_phone_display: phone,
      asset_id: scooter?.id || '',
      asset_label: resolvedAssetLabel,
      scooter_make_model: resolvedAssetLabel,
      scooterDetails: resolvedAssetLabel,
      scooter_details: resolvedAssetLabel,
      issueDescription: issue,
      issue_description: issue,
      issue_summary: issue,
      rideable_status: submitted.isRideable ? 'Rideable' : 'Not rideable',
      source: 'public_booking',
      job_type: 'repair',
      service_type: submitted.serviceType,
      priority: 'medium',
      status: INTAKE_STATUS,
      scheduled_date: form.asap ? null : (form.preferred_date || null),
      preferred_time_window: form.asap ? 'ASAP' : form.preferred_time_window,
      rideable: submitted.isRideable,
      intake,
      booking_submission: submitted,
      business_slug: SLUG,
      createdAt: now,
      created_at: now,
      updatedAt: now,
    });

    if (verificationUse) await completeVerificationUse(entities, verifiedChallenge, verificationUse, 'Job', job.id);
    if (scooter?.id) await entities.Scooter.update(scooter.id, { job_id: addIdList(scooter.job_id, job.id), last_service_date: job.scheduled_date || scooter.last_service_date || '' }).catch(() => null);
    if (customer?.id) await entities.Customer.update(customer.id, { job_id: addIdList(customer.job_id, job.id), last_activity_date: now }).catch(() => null);
    if (rawToken) await ensureGuestGrant(entities, job, rawToken, now);
    await entities.AuditEvent.create({
      event_type: 'booking_created', job_id: job.id, customer_id: stableCustomerId,
      customer_account_id: customer?.id || '', actor_id: customer ? user.id : '', actor_name: name,
      actor_role: customer ? 'customer' : 'guest_customer', outcome: 'succeeded',
      summary: `Booking request received from ${name}`, visibility: 'system',
      metadata: { identity_version: 2, claim_status: customer ? 'claimed' : 'unclaimed', verified_channel: verifiedChallenge?.channel || '' },
    }).catch(() => null);

    const notificationKey = `booking_request:${job.id}:${job.created_date || now}`;
    const queued = await entities.NotificationEvent.filter({ event_key: notificationKey }, '-created_date', 1).catch(() => []);
    if (!queued[0]) {
      await entities.NotificationEvent.create({
        event_key: notificationKey,
        related_entity_type: 'Job',
        related_entity_id: job.id,
        job_id: job.id,
        customer_id: stableCustomerId,
        customer_account_id: customer?.id || '',
        event_version: job.created_date || now,
        event_data: { job_id: job.id },
        source: 'automatic',
        status: 'pending',
        occurred_at: now,
      }).catch(async (error: any) => {
        await entities.AuditEvent.create({ event_type: 'notification_failed', job_id: job.id, customer_account_id: customer?.id || '', actor_name: 'System', actor_role: 'system', outcome: 'failed', summary: `Booking confirmation for ${job.reference} could not be queued`, visibility: 'internal', metadata: { reason: String(error?.message || error).slice(0, 500) } }).catch(() => null);
      });
    }

    return Response.json(responseFor(job, rawToken, customer, scooter, email));
  } catch (error) {
    if (reserved?.use?.id && !reserved.replay) {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.VerificationUse.update(reserved.use.id, { status: 'failed', failure_code: error?.code || 'BOOKING_FAILED' }).catch(() => null);
    }
    const phoneVerificationRequired = error?.code === 'PHONE_VERIFICATION_REQUIRED';
    const status = String(error?.code || '').startsWith('VERIFICATION_') || error?.code === 'CONTACT_MISMATCH' || phoneVerificationRequired ? 403 : 500;
    console.error('[createBooking] failed', JSON.stringify({ code: error?.code || '', message: error?.message || String(error) }));
    return Response.json({
      error: phoneVerificationRequired
        ? 'Verify your mobile number before creating a customer account.'
        : status === 403
        ? 'Please verify your contact details before submitting this booking.'
        : `Sorry — we couldn't submit your booking just now. Please try again or call us on ${businessPhone}.`,
      ...(phoneVerificationRequired ? { code: 'PHONE_VERIFICATION_REQUIRED' } : {}),
    }, { status });
  }
});
