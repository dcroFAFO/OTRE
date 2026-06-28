import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanPhone(value) {
  return String(value || '').trim().replace(/[^\d+]/g, '');
}

function cleanText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  let cleaned = cleanPhone(value);
  if (!cleaned) return '';
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : cleanPhone(value);
}

function moneyTotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.amount || item.total || 0), 0);
}

function lineItemsTotal(items = []) {
  return items.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.unit_price || 0)) - Number(item.discount_amount || 0), 0);
}

function uniq(records) {
  return [...new Map(records.filter(Boolean).map((record) => [record.id, record])).values()];
}

async function findRelatedJobs(svc, customer) {
  const stableId = customer.customer_id || customer.id;
  const email = cleanEmail(customer.email);
  const phone = normalizePhone(customer.phone_e164 || customer.phone || customer.phone_display);
  const batches = await Promise.all([
    svc.Job.filter({ customer_id: stableId }, '-created_date', 200).catch(() => []),
    svc.Job.filter({ customerId: stableId }, '-created_date', 200).catch(() => []),
    svc.Job.filter({ customer_account_id: customer.id }, '-created_date', 200).catch(() => []),
    customer.user_id ? svc.Job.filter({ customer_user_id: customer.user_id }, '-created_date', 200).catch(() => []) : [],
    email ? svc.Job.filter({ customer_email: customer.email }, '-created_date', 200).catch(() => []) : [],
    phone ? svc.Job.filter({ customer_phone_e164: phone }, '-created_date', 200).catch(() => []) : [],
    svc.Job.list('-created_date', 1000).catch(() => []),
  ]);
  const all = uniq(batches.flat());
  return all.filter((job) => {
    if (job.customer_id && job.customer_id !== stableId && job.customer_id !== customer.id) return false;
    if (job.customer_account_id && job.customer_account_id !== customer.id) return false;
    if (job.customer_user_id && customer.user_id && job.customer_user_id !== customer.user_id) return false;
    if (job.customer_id === stableId || job.customer_id === customer.id || job.customerId === stableId || job.customer_account_id === customer.id || (customer.user_id && job.customer_user_id === customer.user_id)) return true;
    const jobEmail = cleanEmail(job.customer_email || job.booking_submission?.customerEmail || job.intake?.customerEmail);
    const jobPhone = normalizePhone(job.customer_phone_e164 || job.customer_phone || job.customer_phone_display || job.booking_submission?.customerPhoneE164 || job.booking_submission?.customerPhone || job.intake?.customerPhoneE164 || job.intake?.customerPhone);
    const hasLegacyMatch = (email && jobEmail === email) || (phone && jobPhone === phone);
    return hasLegacyMatch && !job.customer_id && !job.customer_account_id && !job.customer_user_id;
  });
}

async function findRelatedInvoices(svc, customer, jobs) {
  const stableId = customer.customer_id || customer.id;
  const jobIds = new Set(jobs.map((job) => job.id));
  const batches = await Promise.all([
    svc.Invoice.filter({ customer_id: stableId }, '-created_date', 200).catch(() => []),
    svc.Invoice.filter({ customer_id: customer.id }, '-created_date', 200).catch(() => []),
    ...jobs.map((job) => svc.Invoice.filter({ job_id: job.id }, '-created_date', 50).catch(() => [])),
  ]);
  const invoices = uniq(batches.flat());
  return invoices.filter((invoice) => !invoice.job_id || jobIds.has(invoice.job_id) || invoice.customer_id === stableId || invoice.customer_id === customer.id);
}

function assetDataFromJob(job) {
  const make = job.intake?.make || job.intake?.scooterMake || job.booking_submission?.scooterMake || job.booking_submission?.scooterBrand || '';
  const model = job.intake?.model || job.intake?.scooterModel || job.booking_submission?.scooterModel || (!make ? (job.scooter_make_model || job.scooter_details || '') : '');
  const serial_number = job.intake?.serial_number || job.booking_submission?.serial_number || '';
  const label = [make, model].filter(Boolean).join(' ') || job.asset_label || job.scooter_make_model || job.scooter_details || '';
  return { make, model, serial_number, label };
}

function scooterMatchesJob(scooter, data) {
  if (data.serial_number && cleanText(scooter.serial_number) === cleanText(data.serial_number)) return true;
  const scooterLabel = cleanText([scooter.make, scooter.model].filter(Boolean).join(' '));
  return !!data.label && scooterLabel === cleanText(data.label);
}

async function ensureJobAssets(svc, customer, jobs) {
  const stableId = customer.customer_id || customer.id;
  const [byStable, byAccount] = await Promise.all([
    svc.Scooter.filter({ customer_id: stableId }, 'make', 100).catch(() => []),
    svc.Scooter.filter({ customer_account_id: customer.id }, 'make', 100).catch(() => []),
  ]);
  const scooters = uniq([...byStable, ...byAccount]);
  for (const job of jobs) {
    if (job.asset_id) continue;
    const data = assetDataFromJob(job);
    if (!data.serial_number && !data.model) continue;
    let scooter = scooters.find((item) => scooterMatchesJob(item, data));
    if (!scooter) {
      scooter = await svc.Scooter.create({ customer_id: stableId, customer_account_id: customer.id, job_id: job.id, make: data.make, model: data.model, serial_number: data.serial_number }).catch(() => null);
      if (scooter) scooters.push(scooter);
    }
    if (scooter) {
      await svc.Job.update(job.id, { asset_id: scooter.id, asset_label: [scooter.make, scooter.model].filter(Boolean).join(' ') || data.label }).catch(() => null);
      job.asset_id = scooter.id;
      job.asset_label = [scooter.make, scooter.model].filter(Boolean).join(' ') || data.label;
    }
  }
}

async function findRelatedScooters(svc, customer, jobs) {
  const stableId = customer.customer_id || customer.id;
  const [byStable, byAccount] = await Promise.all([
    svc.Scooter.filter({ customer_id: stableId }, 'make', 100).catch(() => []),
    svc.Scooter.filter({ customer_account_id: customer.id }, 'make', 100).catch(() => []),
  ]);
  const scooters = uniq([...byStable, ...byAccount]);
  return scooters.map((scooter) => {
    const label = [scooter.make, scooter.model].filter(Boolean).join(' ');
    const relatedJobs = jobs.filter((job) => job.asset_id === scooter.id || cleanText(job.asset_label || job.scooter_make_model || job.scooter_details) === cleanText(label));
    const lastServiceDate = relatedJobs.reduce((latest, job) => {
      const date = job.scheduled_date || job.created_date || '';
      return date > latest ? date : latest;
    }, scooter.last_service_date || '');
    return { ...scooter, related_job_count: relatedJobs.length, last_service_date: lastServiceDate };
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.has(String(user.role || '').toLowerCase())) return Response.json({ error: 'Forbidden: Staff access required' }, { status: 403 });

    const { customer_id } = await req.json();
    if (!customer_id) return Response.json({ error: 'customer_id is required' }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    let customer = await svc.Customer.get(customer_id).catch(() => null);
    if (!customer) {
      const matches = await svc.Customer.filter({ customer_id }, '-updated_date', 1).catch(() => []);
      customer = matches[0] || null;
    }
    if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

    const stableCustomerId = customer.customer_id || customer.id;
    const jobs = await findRelatedJobs(svc, customer);
    await Promise.all(jobs.filter((job) => !job.customer_id || !job.customer_account_id).map((job) => svc.Job.update(job.id, {
      customer_id: job.customer_id || stableCustomerId,
      customerId: job.customerId || stableCustomerId,
      customer_account_id: job.customer_account_id || customer.id,
      customer_name: job.customer_name || customer.full_name || customer.name || '',
      customer_email: job.customer_email || customer.email || '',
      customer_phone: job.customer_phone || customer.phone || customer.phone_e164 || '',
      customer_phone_e164: job.customer_phone_e164 || customer.phone_e164 || '',
      customer_phone_display: job.customer_phone_display || customer.phone_display || customer.phone || '',
    }).catch(() => null)));
    await ensureJobAssets(svc, customer, jobs);
    const [invoices, quotes, scooters, notes, feedback, auditsByCustomerId, auditsByField] = await Promise.all([
      findRelatedInvoices(svc, customer, jobs),
      Promise.all(jobs.map((job) => svc.Quote.filter({ job_id: job.id }, '-created_date', 20).catch(() => []))).then((groups) => groups.flat()),
      findRelatedScooters(svc, customer, jobs),
      svc.CustomerNote.filter({ customer_id }, '-created_date', 200).catch(() => []),
      customer.email ? svc.Feedback.filter({ submitted_by_email: customer.email }, '-created_date', 100).catch(() => []) : [],
      svc.AuditEvent.filter({ event_type: 'customer_update', customer_id }, '-created_date', 200).catch(() => []),
      svc.AuditEvent.filter({ event_type: 'customer_update', metadata: { customer_id } }, '-created_date', 200).catch(() => []),
    ]);

    const jobById = Object.fromEntries(jobs.map((job) => [job.id, job]));
    const invoicesByJob = invoices.reduce((map, invoice) => {
      if (!invoice.job_id) return map;
      map[invoice.job_id] = [...(map[invoice.job_id] || []), invoice];
      return map;
    }, {});
    const quotesByJob = quotes.reduce((map, quote) => {
      if (!quote.job_id) return map;
      map[quote.job_id] = [...(map[quote.job_id] || []), quote];
      return map;
    }, {});
    const scooterById = Object.fromEntries(scooters.map((scooter) => [scooter.id, scooter]));

    const relatedJobs = jobs.map((job) => {
      const jobInvoices = invoicesByJob[job.id] || [];
      const jobQuotes = quotesByJob[job.id] || [];
      const asset = scooterById[job.asset_id];
      return {
        id: job.id,
        reference: job.reference || job.job_id || job.id,
        status: job.status || job.job_status || 'requested',
        asset_id: job.asset_id || '',
        asset_label: asset ? [asset.make, asset.model].filter(Boolean).join(' ') : (job.asset_label || job.scooter_make_model || job.scooter_details || ''),
        issue_summary: job.issue_summary || job.issueDescription || job.issue_description || job.booking_submission?.scooterIssueSummary || '',
        service_type: job.service_type || job.job_type || job.issue_summary || '',
        created_date: job.created_date || job.createdAt || job.created_at || '',
        scheduled_date: job.scheduled_date || job.intake?.date || '',
        completed_date: job.completed_date || (job.status === 'completed' ? job.updated_date : ''),
        quoted_total: moneyTotal(jobQuotes) || jobQuotes.reduce((sum, quote) => sum + Number(quote.total || 0) + lineItemsTotal(quote.line_items || []), 0),
        invoiced_total: moneyTotal(jobInvoices),
      };
    });

    const relatedInvoices = invoices.map((invoice) => {
      const job = jobById[invoice.job_id];
      const total = Number(invoice.amount || invoice.total || lineItemsTotal(invoice.line_items || []) || 0);
      const paid = ['paid', 'settled', 'completed'].includes(String(invoice.status || '').toLowerCase());
      return {
        id: invoice.id,
        number: invoice.number || invoice.invoice_id || invoice.id,
        job_id: invoice.job_id || '',
        job_reference: job?.reference || job?.job_id || invoice.job_id || '',
        status: invoice.status || 'outstanding',
        issue_date: invoice.invoiceSentAt || invoice.created_date || '',
        due_date: invoice.due_date || invoice.dueDate || '',
        paid_date: invoice.paid_date || '',
        amount: total,
        currency: invoice.currency || 'AUD',
        outstanding_balance: paid ? 0 : Number(invoice.outstanding_balance ?? invoice.balance_due ?? total),
      };
    });

    const auditMap = {};
    [...(auditsByCustomerId || []), ...(auditsByField || [])].forEach((audit) => { auditMap[audit.id] = audit; });
    const customerAudits = Object.values(auditMap).filter((audit) => audit.customer_id === customer_id || audit.metadata?.customer_id === customer_id || audit.metadata?.stable_customer_id === stableCustomerId);

    const events = [];
    const push = (event) => { if (event.date) events.push(event); };
    push({ kind: 'signup', icon: 'UserPlus', title: 'Account created', date: customer.created_date, meta: customer.account_type });
    relatedJobs.forEach((job) => push({ kind: 'job', icon: 'Wrench', title: `${job.reference} — ${job.service_type || 'Service'}`, subtitle: `Status: ${String(job.status).replace(/_/g, ' ')}`, date: job.created_date, link: `/dashboard/jobs?id=${job.id}` }));
    relatedInvoices.forEach((invoice) => push({ kind: 'invoice', icon: 'Receipt', title: `Invoice ${invoice.number} — ${invoice.currency} ${Number(invoice.amount || 0).toFixed(2)}`, subtitle: `Status: ${invoice.status}`, date: invoice.paid_date || invoice.issue_date, link: `/dashboard/invoices?id=${invoice.id}` }));
    feedback.forEach((item) => push({ kind: 'feedback', icon: 'MessageSquare', title: `Feedback: ${item.subject}`, subtitle: `${item.feedback_type} · ${item.status}`, date: item.created_date }));
    notes.forEach((note) => push({ kind: 'note', icon: 'StickyNote', title: 'Internal note', subtitle: note.body, author: note.author_name, date: note.created_date }));
    customerAudits.forEach((audit) => push({ kind: 'audit', icon: 'RefreshCw', title: audit.summary || 'Account updated', author: audit.actor_name, date: audit.created_date }));
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    return Response.json({
      customer,
      counts: { jobs: relatedJobs.length, invoices: relatedInvoices.length, scooters: scooters.length, feedback: feedback.length, notes: notes.length },
      linked: { jobs: relatedJobs, invoices: relatedInvoices, scooters, feedback: feedback.map((item) => ({ id: item.id, subject: item.subject, type: item.feedback_type, status: item.status, date: item.created_date })) },
      timeline: events,
    });
  } catch (error) {
    console.error('[customerHistory] failed:', error?.message, error?.stack);
    return Response.json({ error: 'Failed to load customer history.' }, { status: 500 });
  }
});