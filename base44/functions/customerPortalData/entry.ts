import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const JOB_LIMIT = 200;
const SCOOTER_LIMIT = 100;
const INVOICE_LIMIT = 200;

function requestId(req: Request) {
  return req.headers.get('x-request-id') || crypto.randomUUID();
}

function ok(data: unknown, id: string) {
  return Response.json({ ok: true, data, request_id: id });
}

function fail(code: string, message: string, id: string, status: number) {
  return Response.json({ ok: false, error: { code, message }, request_id: id }, { status });
}

function clean(value: unknown, maxLength = 1000) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

async function requireCustomer(base44: any) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return { error: 'unauthorized', status: 401 };
  if (user.role !== 'customer') return { error: 'forbidden', status: 403 };
  const rows = await base44.asServiceRole.entities.Customer.filter({ user_id: user.id }, '-updated_date', 2);
  if (rows.length !== 1) return { error: 'profile_conflict', status: 409 };
  return { user, customer: rows[0] };
}

function accountDto(customer: any, user: any) {
  return {
    id: customer.id,
    reference: customer.customer_id || customer.id,
    name: clean(customer.full_name || customer.name || user.full_name, 160),
    email: clean(user.email, 320).toLowerCase(),
    phone_e164: clean(customer.phone_e164, 40),
    status: clean(customer.status || 'active', 40),
    referral_code: clean(customer.referral_code, 80),
    referral_status: clean(customer.referral_status || 'none', 40),
    referral_eligible: customer.referral_eligible === true,
  };
}

function jobDto(job: any) {
  const created = job.created_at || job.createdAt || job.created_date || null;
  const updated = job.updated_at || job.updatedAt || job.updated_date || null;
  return {
    id: job.id,
    reference: clean(job.reference, 100),
    status: clean(job.status, 80),
    source: clean(job.source, 80),
    service_type: clean(job.service_type, 120),
    issue_description: clean(job.issue_description || job.issueDescription, 4000),
    asset_label: clean(job.asset_label || job.scooter_make_model, 240),
    scheduled_date: job.scheduled_date || null,
    preferred_time_window: clean(job.preferred_time_window, 120) || null,
    payment_status: clean(job.payment_status || 'unpaid', 80),
    created_at: created,
    created_date: created,
    updated_at: updated,
    updated_date: updated,
    completed_at: job.completed_at || null,
  };
}

function invoiceDto(invoice: any) {
  if (!invoice || invoice.invoiceVisibility !== 'customer_visible' || invoice.status === 'draft') return null;
  return {
    id: invoice.id,
    job_id: invoice.job_id,
    number: clean(invoice.number, 120),
    status: clean(invoice.status, 80),
    amount: Number(invoice.amount || 0),
    currency: clean(invoice.currency || 'AUD', 12),
    invoiceVisibility: 'customer_visible',
    issued_at: invoice.issued_at || invoice.invoiceSentAt || null,
    due_date: invoice.due_date || null,
    paid_at: invoice.paid_at || invoice.paid_date || null,
    paid_date: invoice.paid_at || invoice.paid_date || null,
    customer_notes: clean(invoice.customer_notes, 5000),
    pre_reward_amount: Number(invoice.pre_reward_amount || 0),
    reward_id: clean(invoice.reward_id, 120),
    reward_kind: clean(invoice.reward_kind, 120),
    reward_discount_amount: Number(invoice.reward_discount_amount || 0),
    reward_snapshot: invoice.reward_snapshot ? { description: clean(invoice.reward_snapshot.description, 500) } : {},
    line_items: (invoice.line_items || []).slice(0, 200).map((item: any) => ({
      description: clean(item.description || 'Line item', 500),
      qty: Number(item.qty || 1),
      unit_price: Number(item.unit_price || item.customer_unit_price || 0),
      tax_rate: Number(item.tax_rate || 0),
      discount_amount: Number(item.discount_amount || 0),
      kind: clean(item.kind || item.category || 'item', 80),
    })),
  };
}

Deno.serve(async (req: Request) => {
  const id = requestId(req);
  try {
    if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST for this action.', id, 405);
    const base44 = createClientFromRequest(req);
    const context = await requireCustomer(base44);
    if (context.error) return fail(context.error, context.error === 'unauthorized' ? 'Sign in to view your account.' : context.error === 'forbidden' ? 'This portal is for customer accounts.' : 'Your customer profile needs support review.', id, context.status);
    const body = await req.json().catch(() => ({}));
    const action = clean(body.action || 'overview', 30);
    const db = base44.asServiceRole.entities;

    if (action === 'overview') {
      const jobs = await db.Job.filter({ customer_account_id: context.customer.id }, '-created_date', JOB_LIMIT);
      const [scooters, invoices] = await Promise.all([
        db.Scooter.filter({ customer_account_id: context.customer.id }, '-updated_date', SCOOTER_LIMIT),
        db.Invoice.filter({ customer_account_id: context.customer.id, invoiceVisibility: 'customer_visible' }, '-created_date', INVOICE_LIMIT),
      ]);
      return ok({
        account: accountDto(context.customer, context.user),
        jobs: jobs.map(jobDto),
        scooters: scooters.filter((scooter: any) => !scooter.archived_at).map((scooter: any) => ({ id: scooter.id, make: clean(scooter.make, 120), model: clean(scooter.model, 120), serial_number: clean(scooter.serial_number, 160), colour: clean(scooter.colour || scooter.color, 80) })),
        invoices: invoices.map(invoiceDto).filter(Boolean),
        limits: { jobs: JOB_LIMIT, scooters: SCOOTER_LIMIT, invoices: INVOICE_LIMIT },
        potentially_truncated: jobs.length === JOB_LIMIT || scooters.length === SCOOTER_LIMIT || invoices.length === INVOICE_LIMIT,
      }, id);
    }

    if (action === 'job') {
      const jobId = clean(body.job_id, 120);
      const job = jobId ? await db.Job.get(jobId) : null;
      if (!job || job.customer_account_id !== context.customer.id) return fail('not_found', 'Repair not found.', id, 404);
      const [invoices, notes, audits] = await Promise.all([
        db.Invoice.filter({ job_id: job.id, invoiceVisibility: 'customer_visible' }, '-created_date', 20),
        db.JobNote.filter({ job_id: job.id, visibility: 'customer' }, '-created_date', 200),
        db.AuditEvent.filter({ job_id: job.id, visibility: 'customer' }, '-created_date', 200),
      ]);
      return ok({
        job: jobDto(job),
        invoices: invoices.map(invoiceDto).filter(Boolean),
        notes: notes.map((note: any) => ({ id: note.id, body: clean(note.body, 5000), author_name: clean(note.author_name || 'Team member', 160), created_date: note.created_date })),
        timeline: audits.map((event: any) => ({ id: event.id, type: clean(event.event_type, 120), summary: clean(event.summary || 'Repair updated', 1000), previous_value: clean(event.previous_value, 500), new_value: clean(event.new_value, 500), created_date: event.created_date })),
        limits: { invoices: 20, notes: 200, timeline: 200 },
        potentially_truncated: invoices.length === 20 || notes.length === 200 || audits.length === 200,
      }, id);
    }

    return fail('unknown_action', 'That portal action is not supported.', id, 400);
  } catch (error) {
    console.error('[customerPortalData]', JSON.stringify({ request_id: id, code: 'portal_data_failed', message: clean(error?.message || error, 500) }));
    return fail('internal_error', 'Customer portal data could not be loaded.', id, 500);
  }
});
