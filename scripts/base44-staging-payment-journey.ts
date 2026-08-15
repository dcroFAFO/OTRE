// Destructive only to records created by this script. Run with:
// Get-Content -Raw scripts/base44-staging-payment-journey.ts |
//   npx base44 --app-id 6a7dd641cf8b4ebde9fbe70b exec --privileged
//
// The hard app-id guard prevents accidental production use. The synthetic
// customer has no email or phone, so notification processing cannot contact a
// real recipient. All created entity records are removed in finally.

const STAGING_APP_ID = "6a7dd641cf8b4ebde9fbe70b";
const config = base44.getConfig?.() || {};
if (config.appId !== STAGING_APP_ID) {
  throw new Error(`Refusing synthetic journey for Base44 app ${config.appId || "unknown"}.`);
}

const currentUser = await base44.auth.me().catch(() => null);
if (!currentUser || currentUser.role !== "admin") {
  throw new Error("An authenticated staging administrator is required.");
}

// `base44 exec --privileged` injects a token that bypasses entity RLS. Do not
// use `asServiceRole` here; CLI exec intentionally does not expose a separate
// backend service token.
const db = base44.entities;
const marker = `OTRE-STAGING-PAYMENT-${Date.now()}`;
const created = {
  customerId: "",
  jobId: "",
  invoiceId: "",
  paymentEventId: "",
};
const report = {
  app_id: config.appId,
  authenticated_role: currentUser.role,
  staff_job_created: false,
  invoice_created: false,
  invoice_issued: false,
  manual_payment_reconciled: false,
  invoice_status: null,
  job_payment_status: null,
  cleanup_complete: false,
};

function unwrap(response) {
  const body = response?.data ?? response;
  return body?.data ?? body;
}

async function rows(entityName, filter) {
  return await db[entityName].filter(filter, "-created_date", 100).catch(() => []);
}

async function remove(entityName, records) {
  for (const record of records || []) {
    if (record?.id) await db[entityName].delete(record.id).catch(() => null);
  }
}

let journeyError = null;
try {
  const createdJob = unwrap(await base44.functions.invoke("staffCreateJob", {
    intake: {
      customerName: marker,
      issueOrService: "Synthetic staging manual-payment readiness check",
      service_type: "general_repair",
      priority: "low",
    },
  }));
  if (!createdJob?.job?.id || !createdJob?.customer_account_id) {
    throw new Error("staffCreateJob did not return the synthetic job and customer.");
  }
  created.jobId = createdJob.job.id;
  created.customerId = createdJob.customer_account_id;
  report.staff_job_created = true;

  const createdInvoice = unwrap(await base44.functions.invoke("invoiceActions", {
    action: "create",
    jobId: created.jobId,
    lineItems: [{
      description: "Synthetic staging readiness check",
      qty: 1,
      unit_price: 12.34,
      kind: "labour",
    }],
  }));
  created.invoiceId = createdInvoice?.invoice?.id || "";
  if (!created.invoiceId) throw new Error("invoiceActions did not create the synthetic invoice.");
  report.invoice_created = true;

  const issued = unwrap(await base44.functions.invoke("invoiceActions", {
    action: "send_to_customer",
    jobId: created.jobId,
    invoiceId: created.invoiceId,
  }));
  if (issued?.invoice?.status !== "issued") throw new Error("The synthetic invoice was not issued.");
  report.invoice_issued = true;

  const paid = unwrap(await base44.functions.invoke("invoiceActions", {
    action: "record_manual_payment",
    jobId: created.jobId,
    invoiceId: created.invoiceId,
    amount_minor: 1234,
    method: "cash",
    reference: marker,
    idempotency_key: `staging-payment-${Date.now()}`,
  }));
  created.paymentEventId = paid?.event?.id || "";
  if (!paid?.reconciliation?.complete) throw new Error("Manual payment needs reconciliation.");

  const [invoice, job] = await Promise.all([
    db.Invoice.get(created.invoiceId),
    db.Job.get(created.jobId),
  ]);
  report.invoice_status = invoice?.status || null;
  report.job_payment_status = job?.payment_status || null;
  report.manual_payment_reconciled = invoice?.status === "paid" && job?.payment_status === "paid";
  if (!report.manual_payment_reconciled) throw new Error("Paid invoice/job projections do not agree.");
} catch (error) {
  journeyError = error;
} finally {
  const paymentEvents = created.jobId ? await rows("PaymentEvent", { job_id: created.jobId }) : [];
  const paymentEffects = [];
  for (const event of paymentEvents) paymentEffects.push(...await rows("PaymentEffect", { payment_event_id: event.id }));
  const notificationEvents = created.jobId ? await rows("NotificationEvent", { job_id: created.jobId }) : [];
  const notificationDeliveries = created.jobId ? await rows("NotificationDelivery", { job_id: created.jobId }) : [];
  const notificationLeases = [];
  for (const event of notificationEvents) notificationLeases.push(...await rows("NotificationWorkLease", { resource_id: event.id }));
  for (const delivery of notificationDeliveries) notificationLeases.push(...await rows("NotificationWorkLease", { resource_id: delivery.id }));

  await remove("NotificationWorkLease", notificationLeases);
  await remove("NotificationDelivery", notificationDeliveries);
  await remove("FeedbackInvitation", created.jobId ? await rows("FeedbackInvitation", { job_id: created.jobId }) : []);
  await remove("NotificationEvent", notificationEvents);
  await remove("PaymentEffect", paymentEffects);
  await remove("PaymentEvent", paymentEvents);
  await remove("CustomerReward", created.jobId ? await rows("CustomerReward", { source_job_id: created.jobId }) : []);
  await remove("AuditEvent", created.jobId ? await rows("AuditEvent", { job_id: created.jobId }) : []);
  if (created.invoiceId) await db.Invoice.delete(created.invoiceId).catch(() => null);
  if (created.jobId) await db.Job.delete(created.jobId).catch(() => null);
  if (created.customerId) await db.Customer.delete(created.customerId).catch(() => null);

  const [remainingJobs, remainingInvoices, remainingCustomers, remainingPayments] = await Promise.all([
    rows("Job", { customer_name: marker }),
    created.jobId ? rows("Invoice", { job_id: created.jobId }) : [],
    rows("Customer", { name: marker }),
    rows("PaymentEvent", { reference: marker }),
  ]);
  report.cleanup_complete = remainingJobs.length === 0 && remainingInvoices.length === 0 && remainingCustomers.length === 0 && remainingPayments.length === 0;
}

console.log(JSON.stringify(report, null, 2));
if (journeyError) throw journeyError;
if (!report.cleanup_complete) throw new Error("Synthetic staging records were not completely removed.");
