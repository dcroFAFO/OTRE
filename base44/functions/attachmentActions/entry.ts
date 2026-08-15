import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, 'application/pdf']);
const SIGNATURE_TYPES = new Set([...IMAGE_TYPES, 'text/plain']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const SIGNED_URL_SECONDS = 120;
const SIGNATURE_POLICIES = Object.freeze({
  'completed-work': {
    consentVersion: 'completed-work-v1',
    consentText: 'I confirm this signature is mine and acknowledge the completed repair work described above.',
    allowedJobStatuses: new Set(['ready_for_pickup', 'invoice_outstanding', 'completed']),
  },
});

function requestId(req) {
  return req.headers.get('x-request-id') || crypto.randomUUID();
}

function ok(data, id, status = 200) {
  return Response.json({ ok: true, data, request_id: id }, { status });
}

function fail(code, message, id, status) {
  return Response.json({ ok: false, error: { code, message }, request_id: id }, { status });
}

function cleanText(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function privateUploadsEnabled() {
  return Deno.env.get('PRIVATE_UPLOADS_ENABLED') === 'true';
}

function validateMetadata(body) {
  const fileUri = cleanText(body.file_uri, 2000);
  const mimeType = cleanText(body.mime_type, 120).toLowerCase();
  const fileSize = Number(body.file_size);
  const kind = body.kind === 'signature' ? 'signature' : body.kind === 'feedback_evidence' ? 'feedback_evidence' : body.kind === 'photo' ? 'photo' : 'document';
  const allowed = kind === 'signature' ? SIGNATURE_TYPES : kind === 'photo' ? IMAGE_TYPES : DOCUMENT_TYPES;
  const maximum = kind === 'document' ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  if (!/^private\/[A-Za-z0-9._~!$&'()+,;=:@%/-]{1,1900}$/.test(fileUri) || fileUri.includes('..') || fileUri.includes('\\') || fileUri.includes('//')) return { error: ['invalid_file', 'A private uploaded file is required.'] };
  if (!allowed.has(mimeType)) return { error: ['invalid_type', 'That file type is not supported.'] };
  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > maximum) return { error: ['invalid_size', `Choose a file smaller than ${maximum / 1024 / 1024} MB.`] };
  return { mimeType, fileSize, kind, fileUri };
}

async function actorContext(base44) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return null;
  if (user.role === 'admin') return { user, isAdmin: true, customer: null };
  if (user.role !== 'customer') return null;
  const customers = await base44.asServiceRole.entities.Customer.filter({ user_id: user.id }, '-updated_date', 2).catch(() => []);
  if (customers.length !== 1) return { user, isAdmin: false, customer: null };
  return { user, isAdmin: false, customer: customers[0] };
}

async function authorizeJob(base44, actor, jobId, allowCustomer = true) {
  const job = await base44.asServiceRole.entities.Job.get(jobId).catch(() => null);
  if (!job) return null;
  if (actor.isAdmin) return job;
  if (!allowCustomer || !actor.customer || job.customer_account_id !== actor.customer.id) return null;
  return job;
}

function attachmentDto(record) {
  return {
    id: record.id,
    job_id: record.job_id,
    file_name: record.file_name,
    mime_type: record.mime_type,
    file_size: record.file_size,
    kind: record.kind,
    visibility: record.visibility,
    description: record.description || '',
    signed_name: record.signed_name || '',
    signature_key: record.signature_key || '',
    signature_method: record.signature_method || '',
    signed_at: record.signed_at || null,
    created_date: record.created_date,
    downloadable: record.storage === 'private' && Boolean(record.file_uri),
  };
}

function safeSignedUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : '';
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  const id = requestId(req);
  try {
    if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST for this action.', id, 405);
    const base44 = createClientFromRequest(req);
    const actor = await actorContext(base44);
    if (!actor) return fail('unauthorized', 'Sign in to continue.', id, 401);
    const body = await req.json().catch(() => ({}));
    const action = cleanText(body.action, 40);

    if (action === 'finalize') {
      if (!privateUploadsEnabled()) return fail('uploads_unavailable', 'Secure uploads are temporarily unavailable.', id, 503);
      const metadata = validateMetadata(body);
      if (metadata.error) return fail(metadata.error[0], metadata.error[1], id, 400);
      const isFeedbackEvidence = metadata.kind === 'feedback_evidence';
      if (isFeedbackEvidence && !actor.customer) return fail('profile_required', 'Finish creating your customer profile before adding feedback evidence.', id, 409);
      if (metadata.kind === 'signature' && !actor.customer && !actor.isAdmin) return fail('profile_required', 'Finish creating your customer profile before signing.', id, 409);
      const jobId = isFeedbackEvidence ? `feedback:${actor.user.id}` : cleanText(body.job_id, 120);
      const job = isFeedbackEvidence ? null : await authorizeJob(base44, actor, jobId, true);
      if (!isFeedbackEvidence && !job) return fail('not_found', 'The job was not found.', id, 404);
      if (!actor.isAdmin && body.visibility === 'internal' && !isFeedbackEvidence) return fail('forbidden', 'Customers cannot create internal attachments.', id, 403);
      if (metadata.kind === 'signature' && !body.signature_idempotency_key) return fail('validation_error', 'A signature idempotency key is required.', id, 400);

      let signaturePolicy = null;
      if (metadata.kind === 'signature') {
        const signatureKey = cleanText(body.signature_key, 120);
        signaturePolicy = SIGNATURE_POLICIES[signatureKey];
        if (!signaturePolicy) return fail('validation_error', 'That signature request is not supported.', id, 400);
        if (!signaturePolicy.allowedJobStatuses.has(String(job?.status || ''))) return fail('invalid_state', 'This repair is not ready for a completion signature.', id, 409);
        if (!['draw', 'typed'].includes(body.signature_method) || cleanText(body.signed_name, 160).length < 2) return fail('validation_error', 'A signature method and full name are required.', id, 400);
        if (body.consent_version !== signaturePolicy.consentVersion || cleanText(body.consent_text, 1000) !== signaturePolicy.consentText) return fail('consent_mismatch', 'The current acknowledgement must be accepted.', id, 400);
      }

      const idempotencyKey = cleanText(body.signature_idempotency_key, 260);
      if (idempotencyKey) {
        const existing = await base44.asServiceRole.entities.Attachment.filter({ signature_idempotency_key: idempotencyKey }, '-created_date', 1).catch(() => []);
        if (existing[0]) {
          if (existing[0].job_id !== job?.id) return fail('conflict', 'That signature request is already in use.', id, 409);
          return ok({ attachment: attachmentDto(existing[0]), created: false }, id);
        }
      }

      const record = await base44.asServiceRole.entities.Attachment.create({
        job_id: job?.id || jobId,
        customer_account_id: job?.customer_account_id || actor.customer?.id || '',
        customer_id: job?.customer_id || '',
        file_uri: metadata.fileUri,
        storage: 'private',
        file_name: cleanText(body.file_name, 180) || 'Upload',
        mime_type: metadata.mimeType,
        file_size: metadata.fileSize,
        kind: metadata.kind,
        visibility: isFeedbackEvidence || (actor.isAdmin && body.visibility === 'internal') ? 'internal' : 'customer',
        uploaded_by_user_id: actor.user.id,
        uploaded_by_name: cleanText(actor.user.full_name, 160) || (actor.isAdmin ? 'Administrator' : 'Customer'),
        description: cleanText(body.description, 1000),
        signature_key: metadata.kind === 'signature' ? cleanText(body.signature_key, 120) : '',
        signature_idempotency_key: idempotencyKey,
        signature_method: ['draw', 'typed'].includes(body.signature_method) ? body.signature_method : undefined,
        signed_name: cleanText(body.signed_name, 160),
        consent_text: signaturePolicy?.consentText || '',
        consent_version: signaturePolicy?.consentVersion || '',
        signed_at: metadata.kind === 'signature' ? new Date().toISOString() : undefined,
      });
      return ok({ attachment: attachmentDto(record), created: true }, id, 201);
    }

    if (action === 'list') {
      const job = await authorizeJob(base44, actor, cleanText(body.job_id, 120), true);
      if (!job) return fail('not_found', 'The job was not found.', id, 404);
      const records = await base44.asServiceRole.entities.Attachment.filter({ job_id: job.id }, '-created_date', 101).catch(() => []);
      const visible = records.filter((row) => !row.archived_at && (actor.isAdmin || row.visibility === 'customer'));
      return ok({ items: visible.slice(0, 100).map(attachmentDto), next_cursor: null, has_more: records.length > 100, partial: records.length > 100, limit: 100 }, id);
    }

    if (action === 'download') {
      const attachment = await base44.asServiceRole.entities.Attachment.get(cleanText(body.attachment_id, 120)).catch(() => null);
      if (!attachment || attachment.archived_at) return fail('not_found', 'The attachment was not found.', id, 404);
      const job = await authorizeJob(base44, actor, attachment.job_id, true);
      if (!job || (!actor.isAdmin && attachment.visibility !== 'customer')) return fail('not_found', 'The attachment was not found.', id, 404);
      if (attachment.storage !== 'private' || !attachment.file_uri) return fail('migration_required', 'This historical file is pending private-storage migration.', id, 409);
      const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: attachment.file_uri, expires_in: SIGNED_URL_SECONDS });
      const signedUrl = safeSignedUrl(signed.signed_url);
      if (!signedUrl) return fail('signing_failed', 'A secure download link could not be created.', id, 502);
      return ok({ signed_url: signedUrl, expires_in: SIGNED_URL_SECONDS, file_name: attachment.file_name }, id);
    }

    if (action === 'archive') {
      if (!actor.isAdmin) return fail('forbidden', 'Administrator access is required.', id, 403);
      const attachment = await base44.asServiceRole.entities.Attachment.get(cleanText(body.attachment_id, 120)).catch(() => null);
      if (!attachment) return fail('not_found', 'The attachment was not found.', id, 404);
      await base44.asServiceRole.entities.Attachment.update(attachment.id, {
        archived_at: attachment.archived_at || new Date().toISOString(),
        archive_reason: cleanText(body.reason, 500) || 'Archived by administrator',
      });
      return ok({ archived: true }, id);
    }

    return fail('unknown_action', 'That attachment action is not supported.', id, 400);
  } catch (error) {
    console.error('[attachmentActions]', JSON.stringify({ request_id: id, code: 'attachment_action_failed', message: String(error?.message || error).slice(0, 500) }));
    return fail('internal_error', 'The attachment request could not be completed.', id, 500);
  }
});
