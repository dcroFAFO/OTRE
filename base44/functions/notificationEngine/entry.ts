import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RECIPIENTS = ['customer', 'assigned_staff', 'all_staff', 'admin'];
const CHANNELS = ['email', 'sms', 'push'];
const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);
const DEDUP = 'event_key+entity_id+recipient+channel+event_version';

const customerEvents = [
  ['account.created','Account','Account created','A customer account is successfully created','security'],
  ['account.email_changed','Account','Email address changed','The customer email address changes','security'],
  ['account.phone_changed','Account','Phone number changed','The customer phone number changes','security'],
  ['security.secure_login','Security','Secure login activity','A supported secure login or password reset occurs','security'],
  ['account.profile_updated','Account','Customer profile updated','The customer saves changed profile details','transactional'],
  ['account.asset_added','Account','Scooter or asset added','A customer adds a scooter or asset','transactional'],
  ['account.asset_updated','Account','Scooter or asset updated','A customer updates a scooter or asset','transactional'],
  ['request.submitted','Request','Repair request submitted','A repair request is successfully created','transactional'],
  ['request.updated','Request','Repair request updated','Customer-facing request details change','transactional'],
  ['request.cancelled','Request','Request cancelled','A requested repair is cancelled','transactional'],
  ['request.more_info_required','Request','More information required','Staff request information before scheduling','transactional'],
  ['request.files_received','Request','Files or photos received','Customer uploads are successfully stored','transactional'],
  ['scheduling.confirmed','Scheduling','Drop-off scheduled','A valid appointment is first confirmed','transactional'],
  ['scheduling.rescheduled','Scheduling','Drop-off rescheduled','A confirmed appointment date or time changes','transactional'],
  ['scheduling.reminder','Scheduling','Drop-off reminder','A scheduled drop-off reminder becomes due','transactional'],
  ['scheduling.cancelled','Scheduling','Appointment cancelled','A confirmed appointment is cancelled','transactional'],
  ['scheduling.missed_dropoff','Scheduling','Missed drop-off','The scheduled drop-off was missed','transactional'],
  ['scheduling.rescheduling_required','Scheduling','Rescheduling required','Staff require the appointment to be moved','transactional'],
  ['scheduling.pickup_scheduled','Scheduling','Pickup or delivery scheduled','A supported pickup or delivery appointment is confirmed','transactional'],
  ['repair.checked_in','Repair','Scooter checked in','The scooter is recorded as received','transactional'],
  ['repair.started','Repair','Repair started','The job first enters repair in progress','transactional'],
  ['repair.waiting_parts','Repair','Waiting on parts','The job first enters waiting on parts','transactional'],
  ['repair.parts_arrived','Repair','Parts arrived','Required parts are recorded as available','transactional'],
  ['repair.delayed','Repair','Repair delayed','A repair delay requiring customer awareness is recorded','transactional'],
  ['repair.info_required','Repair','Customer information required','Repair work is blocked pending customer information','transactional'],
  ['repair.completed','Repair','Repair completed','Repair work is marked complete','transactional'],
  ['invoice.issued','Invoice','Invoice issued','An invoice is finalised and made customer-visible','transactional'],
  ['invoice.payment_requested','Invoice','Payment requested','Payment is explicitly requested for an issued invoice','transactional'],
  ['invoice.reminder','Invoice','Invoice reminder','A due invoice reminder becomes due','transactional'],
  ['invoice.overdue','Invoice','Invoice overdue','An issued invoice passes its due date','transactional'],
  ['invoice.voided','Invoice','Invoice voided or cancelled','An issued invoice is voided or cancelled','transactional'],
  ['payment.received','Payment','Payment received','Payment is confirmed by the provider or authorised staff','transactional'],
  ['payment.partial_received','Payment','Partial payment received','A supported partial payment is confirmed','transactional'],
  ['payment.failed','Payment','Payment failed','A confirmed payment attempt fails','transactional'],
  ['payment.refund_issued','Payment','Refund issued','A refund is confirmed','transactional'],
  ['completion.ready_for_pickup','Completion','Ready for pickup','The job first becomes ready for pickup','transactional'],
  ['completion.pickup_reminder','Completion','Pickup reminder','A ready-for-pickup reminder becomes due','transactional'],
  ['completion.collected','Completion','Scooter collected','Collection is recorded','transactional'],
  ['completion.completed','Completion','Job completed','The job first enters completed','transactional'],
  ['completion.closed','Completion','Job closed','The job is formally closed','transactional'],
  ['completion.care_instructions','Completion','Post-repair care instructions','Care instructions are manually issued','transactional'],
  ['engagement.feedback_request','Customer Engagement','Feedback request','A post-completion feedback request becomes due','marketing'],
  ['engagement.review_request','Customer Engagement','Review request','A post-completion review request becomes due','marketing'],
  ['engagement.referral_prompt','Customer Engagement','Referral prompt','A referral prompt becomes due','marketing'],
  ['engagement.loyalty_progress','Customer Engagement','Loyalty programme progress','A loyalty progress update is available','marketing'],
  ['engagement.loyalty_reward','Customer Engagement','Loyalty reward earned','A loyalty reward is earned','marketing'],
  ['engagement.promotional_offer','Customer Engagement','Promotional offer','An authorised promotional campaign is issued','marketing'],
];

const staffEvents = [
  ['staff.request_received','New repair request received','A new customer repair request is created'],
  ['staff.request_missing_info','Request missing information','A request cannot progress without information'],
  ['staff.request_updated','Customer updated request details','A customer changes request details'],
  ['staff.files_uploaded','Customer uploaded files or photos','A customer upload is received'],
  ['staff.job_scheduled','Job scheduled','A job is first scheduled'],
  ['staff.job_rescheduled','Job rescheduled','A scheduled date or time changes'],
  ['staff.job_assigned','Job assigned','A job is assigned to a staff member'],
  ['staff.job_reassigned','Job reassigned','A job assignment changes'],
  ['staff.schedule_conflict','Schedule conflict detected','A scheduling conflict is detected'],
  ['staff.dropoff_today','Drop-off due today','A scheduled drop-off is due today'],
  ['staff.customer_replied','Customer replied or commented','A customer-visible reply is added'],
  ['staff.job_blocked','Job blocked','A job is blocked from progressing'],
  ['staff.job_on_hold','Job placed on hold','A job first enters on hold'],
  ['staff.parts_required','Parts required','Required parts are recorded'],
  ['staff.parts_unavailable','Parts unavailable','A required part is unavailable'],
  ['staff.repair_completed','Repair completed','Repair work is marked complete'],
  ['staff.invoice_generation_failed','Invoice generation failed','Invoice generation fails'],
  ['staff.payment_failed','Payment failed','A payment attempt fails'],
  ['staff.notification_failed','Notification delivery failed','A delivery attempt fails'],
];

const adminEvents = [
  ['admin.daily_requests','Daily request summary','Daily request digest is due','digest'],
  ['admin.daily_schedule','Daily scheduled-jobs summary','Daily schedule digest is due','digest'],
  ['admin.overdue_jobs','Overdue jobs summary','Overdue jobs digest is due','digest'],
  ['admin.waiting_parts','Jobs waiting on parts summary','Waiting-on-parts digest is due','digest'],
  ['admin.ready_pickup','Jobs ready for pickup summary','Ready-for-pickup digest is due','digest'],
  ['admin.completed_unpaid','Completed jobs with unpaid invoices','Completed-unpaid digest is due','digest'],
  ['admin.payment_failure','Payment failure','A payment provider confirms failure','immediate'],
  ['admin.refund_issued','Refund issued','A refund is confirmed','immediate'],
  ['admin.price_override','Manual discount or price override','A manual financial override is recorded','immediate'],
  ['admin.invoice_generation_failed','Invoice generation failure','Invoice generation fails','immediate'],
  ['admin.booking_submission_failed','Booking submission failure','A booking cannot be stored','immediate'],
  ['admin.email_delivery_failed','Email delivery failure','Email delivery fails','immediate'],
  ['admin.sms_delivery_failed','SMS delivery failure','SMS delivery fails','immediate'],
  ['admin.provider_error','Notification provider outage or error','A provider returns an outage or error','immediate'],
  ['admin.duplicate_prevented','Duplicate notification prevented','A duplicate delivery is blocked','digest'],
  ['admin.retry_exhausted','Failed notification retry exhausted','A delivery exhausts retries','immediate'],
  ['admin.staff_created','Staff account created','A staff account is created','immediate'],
  ['admin.staff_disabled','Staff account disabled','A staff account is disabled','immediate'],
  ['admin.staff_role_changed','Staff role changed','A staff role changes','immediate'],
  ['admin.permission_changed','Admin permission changed','Admin access is granted or removed','immediate'],
  ['admin.notification_settings_changed','Notification settings changed','A global notification rule changes','digest'],
  ['admin.security_activity','Security-sensitive account activity','A security-sensitive event occurs','immediate'],
  ['admin.audit_exception','Customer or financial data audit exception','An audit exception is detected','immediate'],
];

const mandatoryKeys = new Set(['account.created','account.email_changed','account.phone_changed','security.secure_login','admin.security_activity','admin.permission_changed']);
const defaultOffEmail = new Set(['account.profile_updated','account.asset_updated','scheduling.reminder','repair.started','repair.parts_arrived','completion.care_instructions']);
const defaultOnSms = new Set(['request.more_info_required','scheduling.confirmed','scheduling.rescheduled','scheduling.reminder','scheduling.rescheduling_required','repair.info_required','repair.completed','invoice.payment_requested','payment.failed','completion.ready_for_pickup','completion.pickup_reminder']);
const urgentStaffSms = new Set(['staff.schedule_conflict','staff.job_blocked','staff.parts_unavailable','staff.payment_failed','staff.notification_failed']);

function catalog() {
  const rows = customerEvents.map(([key,category,name,trigger,type]) => ({ key, category, name, trigger, type, recipients: ['customer'] }));
  staffEvents.forEach(([key,name,trigger]) => rows.push({ key, category: 'Staff Operations', name, trigger, type: 'operational', recipients: ['assigned_staff','all_staff'] }));
  adminEvents.forEach(([key,name,trigger,timing]) => rows.push({ key, category: 'Admin/System', name, trigger, type: key.includes('security') || key.includes('permission') ? 'security' : 'system', recipients: ['admin'], timing }));
  return rows;
}

function ruleFor(event, recipient, channel, order) {
  const marketing = event.type === 'marketing';
  const mandatory = mandatoryKeys.has(event.key);
  const isPush = channel === 'push';
  const isSms = channel === 'sms';
  const staffSms = event.category === 'Staff Operations' && urgentStaffSms.has(event.key);
  const adminSms = recipient === 'admin' && event.timing === 'immediate' && (event.type === 'security' || event.key.includes('failure') || event.key.includes('error'));
  const emailOn = !defaultOffEmail.has(event.key) && !marketing;
  const smsOn = defaultOnSms.has(event.key) || staffSms || adminSms;
  const enabled = !isPush && (isSms ? smsOn : emailOn);
  const timing = event.key === 'completion.pickup_reminder' ? 'delayed' : event.timing || (marketing ? 'manual_only' : 'immediate');
  return {
    event_key: event.key,
    category: event.category,
    event_name: event.name,
    description: `${event.name} notification for ${recipient.replaceAll('_',' ')} recipients.`,
    trigger_condition: event.trigger,
    recipient_type: recipient,
    channel,
    can_receive: !isPush,
    default_state: isPush ? 'not_applicable' : (enabled ? 'on' : 'off'),
    mandatory,
    toggleable: !mandatory && !isPush,
    toggleable_by: mandatory || isPush ? 'not_toggleable' : recipient === 'customer' ? 'admin_and_customer' : recipient === 'admin' ? 'admin' : 'admin_and_staff',
    notification_type: event.type,
    consent_requirement: marketing ? 'marketing' : event.type === 'security' ? 'none' : 'transactional',
    timing,
    delay_minutes: timing === 'delayed' ? (event.key === 'completion.pickup_reminder' ? 1440 : 60) : 0,
    digest_schedule: timing === 'digest' ? 'Daily at 08:00 Australia/Brisbane' : '',
    template_reference: `${event.key}.${channel}`,
    deduplication_rule: DEDUP,
    active_status: 'active',
    sort_order: order,
    active: true,
  };
}

async function ensureDefaults(db) {
  const existing = await db.NotificationSetting.list('', 500);
  const keys = new Set(existing.filter((r) => r.event_key).map((r) => `${r.event_key}|${r.recipient_type}|${r.channel}`));
  const templates = await db.NotificationTemplate.list('', 500);
  const templateKeys = new Set(templates.map((t) => t.template_key));
  const rulesToCreate = [];
  const templatesToCreate = [];
  let order = 0;
  for (const event of catalog()) {
    for (const recipient of event.recipients) {
      for (const channel of CHANNELS) {
        const identity = `${event.key}|${recipient}|${channel}`;
        if (!keys.has(identity)) rulesToCreate.push(ruleFor(event, recipient, channel, order));
      }
    }
    for (const channel of CHANNELS) {
      const templateKey = `${event.key}.${channel}`;
      if (!templateKeys.has(templateKey)) templatesToCreate.push({
        template_key: templateKey,
        event_key: event.key,
        channel,
        subject: channel === 'email' ? `OTR Scooters — ${event.name}` : '',
        body: channel === 'email'
          ? `<p>Hi {{recipient_name}},</p><p><strong>${event.name}</strong></p><p>{{message}}</p><p>Reference: {{reference}}</p><p>On The Run Electrics</p>`
          : `OTR Scooters: ${event.name}. {{message}} Ref: {{reference}}`,
        active: channel !== 'push',
        version: 1,
      });
    }
    order += 1;
  }
  if (rulesToCreate.length) await db.NotificationSetting.bulkCreate(rulesToCreate);
  if (templatesToCreate.length) await db.NotificationTemplate.bulkCreate(templatesToCreate);
  return { rules_created: rulesToCreate.length, templates_created: templatesToCreate.length };
}

function render(text, values) {
  return String(text || '').replace(/{{(\w+)}}/g, (_, key) => String(values[key] ?? ''));
}

async function sendEmail(to, subject, html) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'On The Run Electrics <hello@ontherunelectrics.com.au>', to: [to], subject, html }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Resend failed with ${response.status}`);
  return { provider: 'resend', id: data.id || '' };
}

async function sendSms(to, body) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!sid || !token || !from) throw new Error('Twilio is not configured');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ From: from, To: to, Body: body }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Twilio failed with ${response.status}`);
  return { provider: 'twilio', id: data.sid || '' };
}

async function usersForRule(db, rule, event, job) {
  if (rule.recipient_type === 'customer') return [{ id: job?.customer_user_id || event.recipient_user_id || '', full_name: job?.customer_name || event.event_data?.customer_name || 'there', email: job?.customer_email || event.event_data?.customer_email || '', phone: job?.customer_phone_e164 || event.event_data?.customer_phone || '' }];
  const assignedId = event.event_data?.assigned_staff_id || job?.assigned_staff_id || job?.assigned_to_user_id || '';
  if (rule.recipient_type === 'assigned_staff') {
    if (!assignedId) return [];
    const user = await db.User.get(assignedId).catch(() => null);
    return user ? [{ ...user, phone: user.phone_e164 || user.phone || '' }] : [];
  }
  const users = await db.User.list('', 500);
  if (rule.recipient_type === 'all_staff') {
    if (assignedId) return [];
    return users.filter((user) => STAFF_ROLES.has(String(user.role || '').toLowerCase()) && user.role !== 'admin').map((user) => ({ ...user, phone: user.phone_e164 || user.phone || '' }));
  }
  return users.filter((user) => user.role === 'admin').map((user) => ({ ...user, phone: user.phone_e164 || user.phone || '' }));
}

async function permitted(db, rule, recipient) {
  if (!rule.can_receive || rule.active_status !== 'active' || rule.default_state === 'not_applicable') return false;
  if (rule.mandatory) return true;
  if (!recipient.id) return rule.default_state === 'on' && rule.notification_type !== 'marketing';
  const prefs = await db.NotificationPreference.filter({ user_id: recipient.id, event_key: rule.event_key, recipient_type: rule.recipient_type, channel: rule.channel }, '-updated_date', 1);
  const pref = prefs[0];
  if (rule.consent_requirement === 'marketing' && !pref?.consent_granted) return false;
  return pref ? !!pref.enabled : rule.default_state === 'on';
}

async function logDuplicate(db, event, rule, idempotencyKey) {
  const existing = await db.NotificationDelivery.filter({ idempotency_key: idempotencyKey }, '-created_date', 1);
  await db.AuditEvent.create({ event_type: 'notification_duplicate_prevented', job_id: event.job_id || '', customer_id: event.customer_id || '', actor_name: 'Notification engine', actor_role: 'system', summary: `Duplicate ${rule.channel} prevented for ${event.event_key}`, visibility: 'system', metadata: { idempotency_key: idempotencyKey, delivery_id: existing[0]?.id || '' } }).catch(() => null);
  if (event.event_key !== 'admin.duplicate_prevented') await createScheduledEventOnce(db, 'admin.duplicate_prevented', 'NotificationDelivery', existing[0]?.id || idempotencyKey, event.job_id || '', event.customer_id || '', idempotencyKey, { message: `Duplicate ${rule.channel} prevented for ${event.event_key}.` }).catch(() => null);
}

async function deliver(db, event, rule, recipient, job, template, existingDelivery = null) {
  const address = rule.channel === 'email' ? recipient.email : recipient.phone;
  if (!address || rule.channel === 'push') return { skipped: 'no supported destination' };
  const idempotencyKey = `${event.event_key}|${event.related_entity_id}|${recipient.id || address}|${rule.channel}|${event.event_version}`;
  if (!existingDelivery) {
    const duplicates = await db.NotificationDelivery.filter({ idempotency_key: idempotencyKey }, '-created_date', 1);
    if (duplicates.length) { await logDuplicate(db, event, rule, idempotencyKey); return { duplicate: true }; }
  }
  const now = new Date().toISOString();
  const scheduledFor = rule.timing === 'delayed' ? new Date(Date.now() + (Number(rule.delay_minutes) || 0) * 60000).toISOString() : now;
  let delivery = existingDelivery;
  if (!delivery) delivery = await db.NotificationDelivery.create({ event_key: event.event_key, notification_event_id: event.id, related_entity_type: event.related_entity_type, related_entity_id: event.related_entity_id, job_id: event.job_id || '', recipient_type: rule.recipient_type, recipient_user_id: recipient.id || '', recipient_address: address, channel: rule.channel, template_reference: rule.template_reference, created_time: now, scheduled_for: scheduledFor, delivery_status: rule.timing === 'immediate' ? 'sending' : 'queued', retry_count: 0, idempotency_key: idempotencyKey, delivery_mode: event.source === 'manual' ? 'manual_resend' : event.source === 'scheduled' ? 'scheduled' : 'automatic', is_resend: false });
  if (rule.timing !== 'immediate' && !existingDelivery) return { queued: true };
  const values = { recipient_name: recipient.full_name || 'there', reference: job?.reference || job?.job_id || event.related_entity_id, message: event.event_data?.message || rule.description };
  try {
    const providerResult = rule.channel === 'email'
      ? await sendEmail(address, render(template?.subject || `OTR Scooters — ${rule.event_name}`, values), render(template?.body || '<p>{{message}}</p>', values))
      : await sendSms(address, render(template?.body || '{{message}}', values));
    await db.NotificationDelivery.update(delivery.id, { delivery_status: 'sent', send_time: new Date().toISOString(), provider: providerResult.provider, provider_message_id: providerResult.id, failure_reason: '' });
    return { sent: true };
  } catch (error) {
    const retries = Number(delivery.retry_count || 0);
    await db.NotificationDelivery.update(delivery.id, { delivery_status: 'failed', failure_reason: error.message, retry_count: retries });
    console.error('[notificationEngine] delivery failed', JSON.stringify({ event_key: event.event_key, channel: rule.channel, delivery_id: delivery.id, message: error.message }));
    if (!event.event_key.startsWith('admin.') && event.event_key !== 'staff.notification_failed') {
      const failureKeys = ['staff.notification_failed', rule.channel === 'email' ? 'admin.email_delivery_failed' : 'admin.sms_delivery_failed', ...(retries >= 3 ? ['admin.retry_exhausted'] : [])];
      await db.NotificationEvent.bulkCreate(failureKeys.map((eventKey) => ({ event_key: eventKey, related_entity_type: 'NotificationDelivery', related_entity_id: delivery.id, job_id: event.job_id || '', customer_id: event.customer_id || '', event_version: `${delivery.id}:${retries}`, event_data: { message: `${rule.channel} delivery failed: ${error.message}` }, source: 'automatic', status: 'pending', occurred_at: new Date().toISOString() }))).catch(() => null);
    }
    return { failed: true, error: error.message };
  }
}

async function dispatch(db, event) {
  if (!event || !event.id) return { skipped: 'event not found' };
  if (event.status === 'processed' || event.status === 'processing') return { skipped: `event ${event.status}` };
  await db.NotificationEvent.update(event.id, { status: 'processing' });
  try {
    const rules = await db.NotificationSetting.filter({ event_key: event.event_key, active_status: 'active' }, 'sort_order', 100);
    const job = event.job_id ? await db.Job.get(event.job_id).catch(() => null) : null;
    const results = [];
    for (const rule of rules) {
      if (rule.timing === 'manual_only') continue;
      const recipients = await usersForRule(db, rule, event, job);
      const templates = await db.NotificationTemplate.filter({ template_key: rule.template_reference, active: true }, '-version', 1);
      for (const recipient of recipients) {
        if (await permitted(db, rule, recipient)) results.push(await deliver(db, event, rule, recipient, job, templates[0] || null));
      }
    }
    await db.NotificationEvent.update(event.id, { status: 'processed', processed_at: new Date().toISOString(), failure_reason: '' });
    return { processed: true, results };
  } catch (error) {
    await db.NotificationEvent.update(event.id, { status: 'failed', failure_reason: error.message });
    throw error;
  }
}

async function createScheduledEventOnce(db, eventKey, entityType, entityId, jobId, customerId, version, eventData = {}) {
  const existing = await db.NotificationEvent.filter({ event_key: eventKey, related_entity_id: entityId, event_version: version }, '-created_date', 1);
  if (existing.length) return false;
  await db.NotificationEvent.create({ event_key: eventKey, related_entity_type: entityType, related_entity_id: entityId, job_id: jobId || '', customer_id: customerId || '', event_version: version, event_data: eventData, source: 'scheduled', status: 'pending', occurred_at: new Date().toISOString() });
  return true;
}

async function generateScheduledEvents(db) {
  const localParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const part = (type) => localParts.find((item) => item.type === type)?.value || '';
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const tomorrowDate = new Date(`${today}T00:00:00+10:00`); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrowDate);
  const scheduled = await db.Job.filter({ scheduled_date: tomorrow }, '-created_date', 200);
  for (const job of scheduled) await createScheduledEventOnce(db, 'scheduling.reminder', 'Job', job.id, job.id, job.customer_id, tomorrow, { customer_name: job.customer_name, customer_email: job.customer_email, customer_phone: job.customer_phone_e164, scheduled_date: tomorrow, message: `Reminder: your drop-off is scheduled for ${tomorrow}.` });
  const ready = await db.Job.filter({ status: 'ready_for_pickup' }, '-updated_date', 200);
  const outstanding = await db.Invoice.filter({ status: 'outstanding', invoiceVisibility: 'customer_visible' }, '-created_date', 200);
  for (const invoice of outstanding) {
    const ageDays = Math.floor((Date.now() - new Date(invoice.invoiceSentAt || invoice.created_date).getTime()) / 86400000);
    if (ageDays < 7) continue;
    const job = await db.Job.get(invoice.job_id).catch(() => null);
    if (!job) continue;
    const occurrence = `week-${Math.floor(ageDays / 7)}`;
    await createScheduledEventOnce(db, 'invoice.reminder', 'Invoice', invoice.id, job.id, invoice.customer_id, occurrence, { customer_name: job.customer_name, customer_email: job.customer_email, customer_phone: job.customer_phone_e164, message: `Reminder: invoice ${invoice.number || ''} remains outstanding.` });
    if (ageDays >= 14) await createScheduledEventOnce(db, 'invoice.overdue', 'Invoice', invoice.id, job.id, invoice.customer_id, 'overdue', { customer_name: job.customer_name, customer_email: job.customer_email, customer_phone: job.customer_phone_e164, message: `Invoice ${invoice.number || ''} is overdue.` });
  }
  if (part('hour') === '08') {
    const requested = await db.Job.filter({ status: 'requested' }, '-created_date', 500);
    const waiting = await db.Job.filter({ status: 'waiting_on_parts' }, '-created_date', 500);
    const completed = await db.Job.filter({ status: 'completed' }, '-created_date', 500);
    const unpaid = completed.filter((job) => job.payment_status !== 'paid');
    const summaries = [
      ['admin.daily_requests', requested.length, 'repair requests'], ['admin.daily_schedule', scheduled.length, 'scheduled jobs'],
      ['admin.waiting_parts', waiting.length, 'jobs waiting on parts'], ['admin.ready_pickup', ready.length, 'jobs ready for pickup'],
      ['admin.completed_unpaid', unpaid.length, 'completed jobs with unpaid invoices'],
    ];
    for (const [key, count, label] of summaries) await createScheduledEventOnce(db, key, 'System', key, '', '', today, { message: `${count} ${label}.` });
  }
}

async function processQueue(db) {
  await generateScheduledEvents(db);
  const now = new Date().toISOString();
  const queued = await db.NotificationDelivery.filter({ delivery_status: 'queued', scheduled_for: { $lte: now } }, 'scheduled_for', 100);
  const failed = await db.NotificationDelivery.filter({ delivery_status: 'failed' }, 'created_time', 100);
  const candidates = [...queued, ...failed.filter((row) => Number(row.retry_count || 0) < 3)];
  const results = [];
  for (const delivery of candidates) {
    const event = await db.NotificationEvent.get(delivery.notification_event_id).catch(() => null);
    const rules = await db.NotificationSetting.filter({ event_key: delivery.event_key, recipient_type: delivery.recipient_type, channel: delivery.channel }, '', 1);
    if (!event || !rules[0]) continue;
    const job = event.job_id ? await db.Job.get(event.job_id).catch(() => null) : null;
    const recipient = { id: delivery.recipient_user_id || '', full_name: job?.customer_name || 'there', email: delivery.channel === 'email' ? delivery.recipient_address : '', phone: delivery.channel === 'sms' ? delivery.recipient_address : '' };
    const templates = await db.NotificationTemplate.filter({ template_key: delivery.template_reference, active: true }, '-version', 1);
    await db.NotificationDelivery.update(delivery.id, { delivery_status: 'sending', retry_count: Number(delivery.retry_count || 0) + 1 });
    results.push(await deliver(db, event, { ...rules[0], timing: 'immediate' }, recipient, job, templates[0] || null, { ...delivery, retry_count: Number(delivery.retry_count || 0) + 1 }));
  }
  return { processed: results.length, results };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole.entities;

    if (body?.event?.entity_name === 'NotificationEvent' && body.event.entity_id) {
      const event = await db.NotificationEvent.get(body.event.entity_id).catch(() => null);
      return Response.json(await dispatch(db, event));
    }
    if (body.action === 'process_queue') return Response.json(await processQueue(db));

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin';
    const recipientType = STAFF_ROLES.has(String(user.role || '').toLowerCase()) ? (isAdmin ? 'admin' : 'assigned_staff') : 'customer';

    if (body.action === 'seed_defaults') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json(await ensureDefaults(db));
    }
    if (body.action === 'list_config') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      await ensureDefaults(db);
      const [rules, deliveries] = await Promise.all([db.NotificationSetting.list('sort_order', 500), db.NotificationDelivery.list('-created_time', 100)]);
      return Response.json({ rules, deliveries });
    }
    if (body.action === 'update_config') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const current = await db.NotificationSetting.get(body.id);
      if (!current) return Response.json({ error: 'Rule not found' }, { status: 404 });
      const allowed = ['can_receive','default_state','mandatory','toggleable','toggleable_by','notification_type','consent_requirement','timing','delay_minutes','digest_schedule','template_reference','deduplication_rule','active_status'];
      const patch = Object.fromEntries(Object.entries(body.data || {}).filter(([key]) => allowed.includes(key)));
      if (patch.mandatory === true) { patch.toggleable = false; patch.toggleable_by = 'not_toggleable'; patch.can_receive = true; patch.default_state = 'on'; }
      if (patch.can_receive === false) { patch.default_state = 'not_applicable'; patch.toggleable = false; patch.toggleable_by = 'not_toggleable'; }
      const updated = await db.NotificationSetting.update(current.id, patch);
      await db.AuditEvent.create({ event_type: 'notification_settings_changed', actor_id: user.id, actor_name: user.full_name || user.email, actor_role: 'admin', summary: `Notification rule updated: ${current.event_key} / ${current.recipient_type} / ${current.channel}`, visibility: 'system', metadata: { before: current, after: updated } });
      return Response.json(updated);
    }
    if (body.action === 'list_preferences') {
      await ensureDefaults(db);
      const rules = await db.NotificationSetting.filter({ recipient_type: recipientType, active_status: 'active' }, 'sort_order', 500);
      const preferences = await db.NotificationPreference.filter({ user_id: user.id }, '-updated_at', 500);
      return Response.json({ rules: rules.filter((r) => r.can_receive && r.channel !== 'push'), preferences });
    }
    if (body.action === 'update_preference') {
      const rules = await db.NotificationSetting.filter({ event_key: body.event_key, recipient_type: recipientType, channel: body.channel, active_status: 'active' }, '', 1);
      const rule = rules[0];
      if (!rule?.can_receive) return Response.json({ error: 'This notification is not available.' }, { status: 403 });
      const authority = recipientType === 'customer' ? ['customer','admin_and_customer'] : recipientType === 'admin' ? ['admin'] : ['staff','admin_and_staff'];
      if (rule.mandatory || !rule.toggleable || !authority.includes(rule.toggleable_by)) return Response.json({ error: 'This notification cannot be changed.' }, { status: 403 });
      const existing = await db.NotificationPreference.filter({ user_id: user.id, event_key: body.event_key, recipient_type: recipientType, channel: body.channel }, '-updated_at', 1);
      const data = { user_id: user.id, event_key: body.event_key, recipient_type: recipientType, channel: body.channel, enabled: !!body.enabled, consent_granted: rule.consent_requirement === 'marketing' ? !!body.consent_granted : false, updated_by: user.id, updated_at: new Date().toISOString() };
      const saved = existing[0] ? await db.NotificationPreference.update(existing[0].id, data) : await db.NotificationPreference.create(data);
      return Response.json(saved);
    }
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[notificationEngine] failed', error.message, error.stack);
    return Response.json({ error: error.message || 'Notification operation failed' }, { status: 500 });
  }
});