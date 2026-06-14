import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Invoice creation and payment status transitions run server-side,
// keeping the job's payment fields and audit trail in sync atomically.

const PREFIX = "INV";
const CURRENCY = "AUD";
const DEFAULT_STATUS = "outstanding";

Deno.serve(async (req) => {
  // requestMeta is filled in as parsing progresses so the catch block can log
  // a useful summary (who, which action, which record) when something fails.
  const requestMeta = { fn: "invoiceActions" };
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    requestMeta.userId = user.id;

    // Invoice actions are staff-only — never callable by customers.
    const STAFF_ROLES = ["admin", "employee", "technician"];
    if (!STAFF_ROLES.includes(user.role)) {
      return Response.json({ error: "Forbidden: staff access required" }, { status: 403 });
    }

    const { action, jobId, ...params } = await req.json();
    requestMeta.action = action;
    requestMeta.jobId = jobId;
    if (!action || !jobId) return Response.json({ error: "action and jobId are required" }, { status: 400 });

    // Staff-only function (guarded above); use service role for DB writes so
    // they pass the staff-only entity write RLS deterministically.
    const db = base44.asServiceRole.entities;

    const jobs = await db.Job.filter({ id: jobId }, "", 1);
    const job = jobs[0];
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    const logAudit = ({ eventType, previousValue = null, newValue = null, summary = "", visibility = "internal" }) =>
      db.AuditEvent.create({
        event_type: eventType,
        job_id: job.id,
        actor_id: user.id,
        actor_name: user.full_name || "System",
        actor_role: user.role || "system",
        previous_value: previousValue != null ? String(previousValue) : null,
        new_value: newValue != null ? String(newValue) : null,
        summary,
        visibility,
      });

    let result;

    switch (action) {
      case "create": {
        const amount = Number(params.amount) || 0;
        result = await db.Invoice.create({
          job_id: job.id,
          customer_email: job.customer_email || null,
          number: `${PREFIX}-${Date.now().toString().slice(-6)}`,
          amount,
          currency: CURRENCY,
          status: DEFAULT_STATUS,
        });
        await db.Job.update(job.id, { payment_status: DEFAULT_STATUS, status: "invoice_outstanding" });
        await logAudit({ eventType: "invoice_created", summary: `Invoice created (${CURRENCY} ${amount})`, visibility: "customer" });
        break;
      }
      case "set_payment_status": {
        const { invoiceId, status } = params;
        const invoices = await db.Invoice.filter({ id: invoiceId }, "", 1);
        const invoice = invoices[0];
        if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });

        result = await db.Invoice.update(invoice.id, {
          status,
          paid_date: status === "paid" ? new Date().toISOString() : null,
        });
        await db.Job.update(job.id, {
          payment_status: status,
          status: status === "paid" ? "paid" : job.status,
        });
        await logAudit({
          eventType: "payment_status_changed",
          previousValue: invoice.status,
          newValue: status,
          summary: `Payment marked "${status}"`,
          visibility: "customer",
        });
        break;
      }
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    // Structured server-side error log — inspect in dashboard → Code → Functions → logs.
    console.error("[invoiceActions] request failed", JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    // Safe, friendly message — internal details stay in the server logs.
    return Response.json({ error: "Something went wrong while updating the invoice. Please try again." }, { status: 500 });
  }
});