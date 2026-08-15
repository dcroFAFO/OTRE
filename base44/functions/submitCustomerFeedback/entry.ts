import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const encoder = new TextEncoder();
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function requestId(req: Request) {
  return req.headers.get('x-request-id') || crypto.randomUUID();
}

function ok(data: unknown, id: string, status = 200) {
  return Response.json({ ok: true, data, request_id: id }, { status });
}

function fail(code: string, message: string, id: string, status: number) {
  return Response.json({ ok: false, error: { code, message }, request_id: id }, { status });
}

function clean(value: unknown, maxLength = 1000) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function safePageContext(value: unknown) {
  const raw = clean(value, 500);
  if (!raw) return '';
  try {
    const url = new URL(raw, 'https://ontherunelectrics.com.au');
    return clean(url.pathname, 300);
  } catch {
    return '';
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function currentCustomer(db: any, user: any) {
  if (!user || user.role !== 'customer') return null;
  const rows = await db.Customer.filter({ user_id: user.id }, '-updated_date', 2).catch(() => []);
  return rows.length === 1 ? rows[0] : null;
}

async function recoverUse(db: any, use: any) {
  if (!use) return null;
  const feedback = await db.Feedback.filter({ invitation_use_id: use.id }, '-created_date', 2).catch(() => []);
  if (feedback.length !== 1) return null;
  if (use.status !== 'completed') {
    await db.VerificationUse.update(use.id, { status: 'completed', subject_type: 'Feedback', subject_id: feedback[0].id, completed_at: new Date().toISOString(), failure_code: '' }).catch(() => null);
  }
  return feedback[0];
}

async function authorizeByInvitation(db: any, token: string) {
  if (!TOKEN_PATTERN.test(token)) return { error: 'invalid_invitation', status: 403 };
  const tokenHash = await sha256(token);
  const matches = await db.FeedbackInvitation.filter({ token_hash: tokenHash }, '-created_date', 2).catch(() => []);
  if (matches.length !== 1) return { error: 'invalid_invitation', status: 403 };
  const invitation = matches[0];
  if (invitation.revoked_at || !invitation.expires_at || new Date(invitation.expires_at).getTime() <= Date.now()) return { error: 'expired_invitation', status: 410 };
  if (invitation.used_at || invitation.feedback_id) return { duplicate: true };

  const challengeId = `feedback:${invitation.id}`;
  let uses = await db.VerificationUse.filter({ challenge_id: challengeId }, '-created_date', 2).catch(() => []);
  let use = uses[0] || null;
  const recovered = await recoverUse(db, use);
  if (recovered) return { duplicate: true };
  if (use?.status === 'reserved') return { error: 'invitation_in_progress', status: 409 };
  if (use?.status === 'failed') {
    use = await db.VerificationUse.update(use.id, { status: 'reserved', reserved_at: new Date().toISOString(), failure_code: '' });
  }
  if (!use) {
    try {
      use = await db.VerificationUse.create({
        challenge_id: challengeId,
        operation_id: `feedback-submit:${invitation.id}`,
        purpose: 'feedback_submission',
        status: 'reserved',
        subject_type: 'Feedback',
        reserved_at: new Date().toISOString(),
      });
    } catch {
      uses = await db.VerificationUse.filter({ challenge_id: challengeId }, '-created_date', 2).catch(() => []);
      use = uses[0] || null;
      const raced = await recoverUse(db, use);
      if (raced) return { duplicate: true };
      return { error: 'invitation_in_progress', status: 409 };
    }
  }

  const job = await db.Job.get(invitation.job_id).catch(() => null);
  const invoice = await db.Invoice.get(invitation.invoice_id).catch(() => null);
  if (!job || !invoice || invoice.job_id !== job.id || invoice.status !== 'paid' || (invitation.customer_account_id && invitation.customer_account_id !== job.customer_account_id)) {
    await db.VerificationUse.update(use.id, { status: 'failed', failure_code: 'INVITATION_STATE_MISMATCH' }).catch(() => null);
    return { error: 'invalid_invitation', status: 403 };
  }
  return { invitation, use, job };
}

Deno.serve(async (req: Request) => {
  const id = requestId(req);
  let reservation: any = null;
  let entities: any = null;
  try {
    if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST for this action.', id, 405);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    entities = db;
    const body = await req.json().catch(() => ({}));
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail('validation_error', 'Choose a rating from one to five stars.', id, 400);
    const message = clean(body.message, 5000);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role === 'admin') return fail('forbidden', 'Use the internal feedback workflow from an administrator account.', id, 403);

    let job = null;
    let customer = null;
    let invitationUseId = '';
    const token = clean(body.token, 160);
    if (token) {
      const authorized = await authorizeByInvitation(db, token);
      if (authorized.duplicate) return ok({ accepted: true, duplicate: true }, id);
      if (authorized.error) return fail(authorized.error, authorized.status === 410 ? 'This feedback link has expired.' : authorized.status === 409 ? 'This feedback is already being processed. Please wait before retrying.' : 'This feedback link is not valid.', id, authorized.status);
      reservation = authorized;
      job = authorized.job;
      invitationUseId = authorized.use.id;
    } else {
      customer = await currentCustomer(db, user);
      if (!customer) return fail('unauthorized', 'Sign in or use the private link from your feedback invitation.', id, 401);
      const jobId = clean(body.job_id, 120);
      job = jobId ? await db.Job.get(jobId).catch(() => null) : null;
      if (!job || job.customer_account_id !== customer.id) return fail('not_found', 'The repair could not be found.', id, 404);
    }

    let attachmentId = '';
    if (body.attachment_id && user?.id) {
      const attachment = await db.Attachment.get(clean(body.attachment_id, 120)).catch(() => null);
      if (!attachment || attachment.kind !== 'feedback_evidence' || attachment.uploaded_by_user_id !== user.id || attachment.customer_account_id !== customer?.id || attachment.storage !== 'private') return fail('invalid_attachment', 'The selected attachment is not available.', id, 400);
      attachmentId = attachment.id;
    }

    const record = await db.Feedback.create({
      subject: `${rating}-star customer rating${job.reference ? ` — ${clean(job.reference, 80)}` : ''}`,
      feedback_type: 'Customer Rating',
      message: message || `${rating} star rating submitted by customer.`,
      rating,
      job_id: job.id,
      customer_id: job.customer_id || '',
      priority: rating <= 2 ? 'High' : 'Medium',
      status: 'New',
      submitted_by: user?.id || '',
      submitted_by_name: clean(job.customer_name || customer?.full_name || 'Customer', 160),
      submitted_by_email: clean(job.customer_email || customer?.email, 320).toLowerCase(),
      page_context: safePageContext(body.page_context),
      device_context: clean(body.device_context, 100),
      app_context: '',
      attachment_id: attachmentId,
      invitation_use_id: invitationUseId,
      is_archived: false,
      upvotes: 0,
      tags: ['customer-rating', `rating-${rating}`],
    });

    if (reservation) {
      const completedAt = new Date().toISOString();
      await db.VerificationUse.update(reservation.use.id, { status: 'completed', subject_type: 'Feedback', subject_id: record.id, completed_at: completedAt, failure_code: '' });
      await db.FeedbackInvitation.update(reservation.invitation.id, { used_at: completedAt, feedback_id: record.id });
    }
    return ok({ accepted: true, feedback_id: record.id, duplicate: false }, id, 201);
  } catch (error) {
    if (reservation?.use?.id && entities) await entities.VerificationUse.update(reservation.use.id, { status: 'failed', failure_code: 'FEEDBACK_CREATE_FAILED' }).catch(() => null);
    console.error('[submitCustomerFeedback]', JSON.stringify({ request_id: id, code: 'feedback_submit_failed', message: clean(error?.message || error, 500) }));
    return fail('internal_error', 'Your feedback could not be sent. Please try again.', id, 500);
  }
});
