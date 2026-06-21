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

    const { action, jobId, ...params } = await req.json();
    requestMeta.action = action;
    requestMeta.jobId = jobId;
    if (!action || !jobId) return Response.json({ error: "action and jobId are required" }, { status: 400 });

    let job = null;
    try {
      job = await base44.asServiceRole.entities.Job.get(jobId);
    } catch {
      try {
        const jobs = await base44.asServiceRole.entities.Job.filter({ id: jobId }, "", 1);
        job = jobs[0] || null;
      } catch {
        job = null;
      }
    }
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
    const isStaff = ["admin", "employee", "technician", "staff"].includes(user.role) || (user.is_customer === false || user.data?.is_customer === false);

    const logAudit = ({ eventType, previousValue = null, newValue = null, summary = "", visibility = "internal" }) =>
      base44.asServiceRole.entities.AuditEvent.create({
        event_type: eventType,
        job_id: job.job_id || job.id,
        customer_id: job.customer_id || "",
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
        const lineItems = Array.isArray(params.lineItems) ? params.lineItems.map((item) => ({
          description: item.description || "Line item",
          qty: Number(item.qty) || 1,
          unit_price: Number(item.unit_price) || 0,
          kind: item.kind || "item",
          sku: item.sku || "",
          source_usage_id: item.source_usage_id || "",
        })) : [];
        const calculatedAmount = lineItems.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
        const amount = calculatedAmount || Number(params.amount) || 0;
        result = await base44.asServiceRole.entities.Invoice.create({
          job_id: job.id,
          customer_id: job.customer_id || "",
          number: `${PREFIX}-${Date.now().toString().slice(-6)}`,
          amount,
          currency: CURRENCY,
          status: DEFAULT_STATUS,
          line_items: lineItems,
        });
        await base44.asServiceRole.entities.Job.update(job.id, { invoice_id: result.id, payment_status: DEFAULT_STATUS });
        await logAudit({ eventType: "invoice_created", summary: `Invoice created (${CURRENCY} ${amount})`, visibility: "customer" });
        break;
      }
      case "copy_quote": {
        if (!isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });
        const quotes = await base44.asServiceRole.entities.Quote.filter({ job_id: job.id }, "-created_date", 1);
        const quote = quotes[0];
        if (!quote) return Response.json({ error: "No estimate or costing found for this job" }, { status: 404 });

        const lineItems = (quote.line_items || []).map((item) => ({
          description: item.description || "Line item",
          qty: Number(item.qty) || 1,
          unit_price: Number(item.unit_price) || 0,
          kind: item.kind || "item",
          sku: item.sku || item.product_sku || item.product_code || item.code || "",
        }));
        const amount = Number(quote.total) || lineItems.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
        const existing = await base44.asServiceRole.entities.Invoice.filter({ job_id: job.id }, "-created_date", 1);
        const invoiceData = {
          quote_id: quote.id,
          job_id: job.id,
          customer_id: job.customer_id || quote.customer_id || "",
          amount,
          currency: quote.currency || CURRENCY,
          status: existing[0]?.status || DEFAULT_STATUS,
          line_items: lineItems,
        };

        if (existing[0]) {
          result = await base44.asServiceRole.entities.Invoice.update(existing[0].id, invoiceData);
        } else {
          result = await base44.asServiceRole.entities.Invoice.create({
            ...invoiceData,
            number: `${PREFIX}-${Date.now().toString().slice(-6)}`,
          });
        }
        await base44.asServiceRole.entities.Job.update(job.id, {
          invoice_id: result.id,
          payment_status: result.status || DEFAULT_STATUS,
          status: result.status === "paid" ? "paid" : job.status,
        });
        await logAudit({ eventType: "costing_copied_to_invoice", summary: `Costing copied to invoice (${invoiceData.currency} ${amount.toFixed(2)})`, visibility: "customer" });
        break;
      }
      case "add_parts_to_invoice": {
        if (!isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });
        const usageIds = Array.isArray(params.usageIds) ? params.usageIds : [];
        if (usageIds.length === 0) return Response.json({ error: "No parts selected" }, { status: 400 });

        let invoice = null;
        if (job.invoice_id) {
          try {
            invoice = await base44.asServiceRole.entities.Invoice.get(job.invoice_id);
          } catch {
            invoice = null;
          }
        }
        if (!invoice) {
          const invoices = await base44.asServiceRole.entities.Invoice.filter({ job_id: job.id }, "-created_date", 1);
          invoice = invoices[0] || null;
        }
        if (!invoice) return Response.json({ error: "Create an invoice first" }, { status: 404 });

        const usages = [];
        for (const usageId of usageIds) {
          const usage = await base44.asServiceRole.entities.InventoryUsage.get(usageId);
          if (usage && (usage.job_id === job.id || usage.job_id === job.job_id)) usages.push(usage);
        }
        if (usages.length === 0) return Response.json({ error: "No matching parts found" }, { status: 404 });

        const existingItems = invoice.line_items || [];
        const existingKeys = new Set(existingItems.map((item) => `${item.source_usage_id || ""}|${item.description || ""}`));
        const newItems = usages
          .map((usage) => ({
            description: usage.item_name || "Part",
            qty: Number(usage.qty_used) || 1,
            unit_price: Number(usage.unit_sell || usage.unit_cost || 0),
            kind: "part",
            sku: usage.product_sku || usage.item_id || "",
            source_usage_id: usage.id,
          }))
          .filter((item) => !existingKeys.has(`${item.source_usage_id}|${item.description}`));

        if (newItems.length === 0) return Response.json({ error: "Selected parts are already on the invoice" }, { status: 400 });
        const line_items = [...existingItems, ...newItems];
        const amount = line_items.reduce((sum, item) => sum + (Number(item.qty) || 1) * (Number(item.unit_price) || 0), 0);
        result = await base44.asServiceRole.entities.Invoice.update(invoice.id, { line_items, amount });
        await Promise.all(usages.map((usage) => base44.asServiceRole.entities.InventoryUsage.update(usage.id, { invoice_id: invoice.id })));
        await logAudit({ eventType: "parts_added_to_invoice", summary: `Added ${newItems.length} part(s) to invoice`, visibility: "customer" });
        break;
      }
      case "set_payment_status": {
        if (!isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });
        const { invoiceId, status } = params;
        const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
        if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });

        result = await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          status,
          paid_date: status === "paid" ? new Date().toISOString() : null,
        });
        await base44.asServiceRole.entities.Job.update(job.id, {
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