import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  CANCELLED_STATUS,
  READY_STATUS,
  REOPEN_STATUS,
  statusLabel,
  validateStatusTransition,
} from './domain.ts';

// All job mutations (status, scheduling, checklist, notes) run
// server-side here, with audit events written in the same request.

const PARTS_MARKUP_PERCENT = 20;
const PARTS_MARKUP_MULTIPLIER = 1.2;

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const customerPriceFromCost = (cost) => roundMoney((Number(cost) || 0) * PARTS_MARKUP_MULTIPLIER);

const findJobInvoice = async (base44, job) => {
  if (job.invoice_id) {
    try {
      return await base44.asServiceRole.entities.Invoice.get(job.invoice_id);
    } catch {
      // Fall through to latest invoice lookup if the stored link is stale.
    }
  }
  const invoices = await base44.asServiceRole.entities.Invoice.filter({ job_id: job.id }, "-created_date", 1);
  return invoices[0] || null;
};

const listJobPartUsages = async (base44, job) => {
  const primary = await base44.asServiceRole.entities.InventoryUsage.filter({ job_id: job.id, source: "inventory" }, "-created_date", 100);
  if (!job.job_id || job.job_id === job.id) return primary;
  const legacy = await base44.asServiceRole.entities.InventoryUsage.filter({ job_id: job.job_id, source: "inventory" }, "-created_date", 100);
  const seen = new Set();
  return [...primary, ...legacy].filter((usage) => {
    if (seen.has(usage.id)) return false;
    seen.add(usage.id);
    return true;
  });
};

// Makes the invoice visible in the customer portal. Deliberately sends NO
// email/SMS — notifications are handled by the single clean notification flow.
const makeInvoiceCustomerVisible = async (base44, job) => {
  const invoice = await findJobInvoice(base44, job);
  if (!invoice) return { invoice: null, warning: "No invoice exists for this job" };
  const now = new Date().toISOString();
  const visibleInvoice = await base44.asServiceRole.entities.Invoice.update(invoice.id, {
    invoiceVisibility: "customer_visible",
    invoiceVisibleAt: invoice.invoiceVisibleAt || now,
    invoiceSentAt: invoice.invoiceSentAt || now,
  });
  return { invoice: visibleInvoice };
};

const addUninvoicedPartsToInvoice = async (base44, job) => {
  const invoice = await findJobInvoice(base44, job);
  if (!invoice) return { addedCount: 0, invoice: null };

  const usages = await listJobPartUsages(base44, job);
  const existingItems = invoice.line_items || [];
  const existingUsageIds = new Set(existingItems.map((item) => item.source_usage_id).filter(Boolean));
  const newItems = usages
    .filter((usage) => usage.id && usage.invoice_id !== invoice.id && !existingUsageIds.has(usage.id))
    .map((usage) => {
      const customerUnitPrice = Number(usage.unit_sell) || customerPriceFromCost(usage.unit_cost || 0);
      const qty = Number(usage.qty_used) || 1;
      return {
        description: usage.item_name || "Part",
        qty,
        unit_price: customerUnitPrice,
        internal_cost_price: Number(usage.unit_cost) || 0,
        markup_percentage: Number(usage.markup_percentage) || PARTS_MARKUP_PERCENT,
        customer_unit_price: customerUnitPrice,
        customer_line_total: roundMoney(customerUnitPrice * qty),
        is_custom_misc_part: !!usage.is_custom_misc_part,
        staff_notes: usage.note || "",
        kind: String(usage.item_id || "").startsWith("labour-") ? "labour" : "part",
        sku: usage.product_sku || usage.item_id || "",
        source_usage_id: usage.id,
      };
    });

  if (newItems.length === 0) return { addedCount: 0, invoice };

  const line_items = [...existingItems, ...newItems];
  const amount = line_items.reduce((sum, item) => sum + (Number(item.qty) || 1) * (Number(item.unit_price) || 0), 0);
  const updatedInvoice = await base44.asServiceRole.entities.Invoice.update(invoice.id, { line_items, amount });
  await Promise.all(newItems.map((item) =>
    base44.asServiceRole.entities.InventoryUsage.update(item.source_usage_id, { invoice_id: invoice.id })
  ));
  return { addedCount: newItems.length, invoice: updatedInvoice };
};

Deno.serve(async (req) => {
  // requestMeta is filled in as parsing progresses so the catch block can log
  // a useful summary (who, which action, which record) when something fails.
  const requestMeta = { fn: "jobActions" };
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

    const logAudit = ({ eventType, previousValue = null, newValue = null, summary = "", visibility = "internal", metadata = {} }) =>
      base44.asServiceRole.entities.AuditEvent.create({
        event_type: eventType,
        job_id: job.job_id || job.id,
        customer_id: job.customer_id,
        actor_id: user.id,
        actor_name: user.full_name || "System",
        actor_role: user.role || "system",
        previous_value: previousValue != null ? String(previousValue) : null,
        new_value: newValue != null ? String(newValue) : null,
        summary,
        visibility,
        metadata,
      });

    let result;

    switch (action) {
      case "change_status": {
        const transition = validateStatusTransition(job, params.newStatus);
        if (!transition.ok) return Response.json({ error: transition.error }, { status: 400 });
        const { currentStatus, nextStatus } = transition;
        if (currentStatus === nextStatus && job.status === nextStatus) { result = job; break; }
        result = await base44.entities.Job.update(job.id, { status: nextStatus });
        await logAudit({
          eventType: "status_changed",
          previousValue: statusLabel(currentStatus),
          newValue: statusLabel(nextStatus),
          summary: `Status changed to "${statusLabel(nextStatus)}"`,
          visibility: "customer",
        });
        if (nextStatus === READY_STATUS) {
          const readyJob = { ...job, ...result };
          const invoiceSync = await addUninvoicedPartsToInvoice(base44, readyJob);
          if (invoiceSync.addedCount > 0) {
            await logAudit({
              eventType: "parts_added_to_invoice",
              summary: `Automatically added ${invoiceSync.addedCount} part(s) to invoice`,
              visibility: "internal",
            });
          }
          const visible = await makeInvoiceCustomerVisible(base44, readyJob);
          await logAudit({
            eventType: visible.invoice ? "invoice_customer_visible" : "invoice_missing_on_ready",
            summary: visible.invoice ? "Invoice made customer-visible" : "Ready for pickup set without an invoice",
            visibility: visible.invoice ? "customer" : "internal",
          });
        }
        break;
      }
      case "reschedule": {
        result = await base44.entities.Job.update(job.id, { scheduled_date: params.newDate });
        await logAudit({
          eventType: "job_rescheduled",
          previousValue: job.scheduled_date,
          newValue: params.newDate,
          summary: `Rescheduled to ${params.newDate}`,
          visibility: "customer",
        });
        break;
      }
      case "mark_ready": {
        const transition = validateStatusTransition(job, READY_STATUS);
        if (!transition.ok) return Response.json({ error: transition.error }, { status: 400 });
        result = await base44.entities.Job.update(job.id, { ready_for_pickup: true, status: READY_STATUS });
        await logAudit({ eventType: "ready_for_pickup", summary: "Marked ready for pickup", visibility: "customer" });
        const readyJob = { ...job, ...result };
        const invoiceSync = await addUninvoicedPartsToInvoice(base44, readyJob);
        if (invoiceSync.addedCount > 0) {
          await logAudit({
            eventType: "parts_added_to_invoice",
            summary: `Automatically added ${invoiceSync.addedCount} part(s) to invoice`,
            visibility: "internal",
          });
        }
        const visible = await makeInvoiceCustomerVisible(base44, readyJob);
        await logAudit({
          eventType: visible.invoice ? "invoice_customer_visible" : "invoice_missing_on_ready",
          summary: visible.invoice ? "Invoice made customer-visible" : "Ready for pickup set without an invoice",
          visibility: visible.invoice ? "customer" : "internal",
        });
        break;
      }
      case "cancel": {
        const transition = validateStatusTransition(job, CANCELLED_STATUS);
        if (!transition.ok) return Response.json({ error: transition.error }, { status: 400 });
        result = await base44.entities.Job.update(job.id, { status: CANCELLED_STATUS });
        await logAudit({ eventType: "job_cancelled", summary: "Job cancelled", visibility: "customer" });
        break;
      }
      case "reopen": {
        const transition = validateStatusTransition(job, REOPEN_STATUS, { reopen: true });
        if (!transition.ok) return Response.json({ error: transition.error }, { status: 400 });
        result = await base44.entities.Job.update(job.id, { status: REOPEN_STATUS });
        await logAudit({ eventType: "job_reopened", summary: "Job reopened" });
        break;
      }
      case "toggle_checklist": {
        const index = Number(params.index);
        const checklist = (job.checklist || []).map((c, i) => (i === index ? { ...c, done: !c.done } : c));
        result = await base44.entities.Job.update(job.id, { checklist });
        const item = checklist[index];
        await logAudit({
          eventType: "checklist_updated",
          summary: `Checklist item "${item?.label}" marked ${item?.done ? "done" : "not done"}`,
        });
        break;
      }
      case "save_private_notes": {
        if (!isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });
        result = await base44.asServiceRole.entities.Job.update(job.id, { private_notes: params.privateNotes || "" });
        await logAudit({ eventType: "private_notes_updated", summary: params.privateNotes ? "Private notes updated" : "Private notes deleted", visibility: "internal" })
          .catch((auditError) => console.warn("[jobActions] private notes audit skipped:", auditError.message));
        break;
      }
      case "add_note": {
        const { body, visibility } = params;
        result = await base44.entities.JobNote.create({
          job_id: job.id,
          body,
          visibility,
          author_id: user.id,
          author_name: user.full_name,
          author_role: user.role,
        });
        await logAudit({
          eventType: visibility === "customer" ? "customer_note_added" : "note_added",
          summary: visibility === "customer" ? "Customer-visible note added" : "Internal note added",
          visibility: visibility === "customer" ? "customer" : "internal",
        });
        break;
      }
      case "add_inventory_parts": {
        if (!isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });
        const parts = Array.isArray(params.parts) ? params.parts : [];
        if (parts.length === 0) return Response.json({ error: "No parts selected" }, { status: 400 });

        result = await Promise.all(parts.map((part) => {
          const qty = Math.max(0.01, Number(part.qty) || 1);
          const costPrice = roundMoney(part.cost_price ?? part.price ?? 0);
          const customerUnitPrice = roundMoney(part.customer_price ?? customerPriceFromCost(costPrice));
          const isMisc = !!part.is_custom_misc_part;
          return base44.asServiceRole.entities.InventoryUsage.create({
            job_id: job.id,
            invoice_id: job.invoice_id || "",
            customer_id: job.customer_id || "",
            item_id: isMisc ? `misc-${crypto.randomUUID()}` : part.id,
            item_name: String(part.name || "Part").trim(),
            qty_used: qty,
            unit_cost: costPrice,
            unit_sell: customerUnitPrice,
            markup_percentage: PARTS_MARKUP_PERCENT,
            customer_line_total: roundMoney(customerUnitPrice * qty),
            is_custom_misc_part: isMisc,
            note: part.note || "",
            source: "inventory",
            product_id: isMisc ? "" : part.id,
            product_sku: part.sku || "",
            category_key: part.category_key || "",
            category_label: part.category_label || "",
          });
        }));
        await logAudit({
          eventType: "parts_added",
          summary: `Added ${parts.length} part(s) to job`,
          newValue: parts.map((part) => part.name).filter(Boolean).join(", "),
        });
        break;
      }
      case "remove_inventory_part":
      case "remove_inventory_parts": {
        if (!isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });
        const usageIds = action === "remove_inventory_parts"
          ? (Array.isArray(params.usageIds) ? params.usageIds : [])
          : (params.usageId ? [params.usageId] : []);
        if (usageIds.length === 0) return Response.json({ error: "No parts selected" }, { status: 400 });

        const removed = [];
        for (const usageId of usageIds) {
          const usage = await base44.asServiceRole.entities.InventoryUsage.get(usageId);
          if (!usage) continue;
          if (usage.job_id !== job.id && usage.job_id !== job.job_id) {
            return Response.json({ error: "Part does not belong to this job" }, { status: 403 });
          }

          try {
            const item = await base44.asServiceRole.entities.InventoryItem.get(usage.item_id);
            if (item) {
              await base44.asServiceRole.entities.InventoryItem.update(usage.item_id, {
                qty_on_hand: (Number(item.qty_on_hand) || 0) + (Number(usage.qty_used) || 0),
              });
            }
          } catch (stockError) {
            console.warn("[jobActions] stock restore skipped:", stockError.message);
          }

          await base44.asServiceRole.entities.InventoryUsage.delete(usage.id);
          removed.push(usage);
        }

        result = { removed: true, count: removed.length, usageIds: removed.map((usage) => usage.id) };
        await logAudit({
          eventType: removed.length > 1 ? "parts_removed" : "part_removed",
          summary: `Removed ${removed.length} part(s) from job`,
          previousValue: removed.map((usage) => usage.item_name).filter(Boolean).join(", "),
        });
        break;
      }
      case "list_activity": {
        if (!isStaff && job.customer_id !== user.customer_id && job.customer_id !== user.data?.customer_id) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const jobKeys = [job.id, job.job_id].filter(Boolean);
        const auditLists = await Promise.all(jobKeys.map((key) =>
          base44.asServiceRole.entities.AuditEvent.filter({ job_id: key }, "-created_date", 200)
        ));
        const audits = Array.from(new Map(auditLists.flat().map((event) => [event.id, event])).values())
          .filter((event) => !["note_added", "customer_note_added"].includes(event.event_type));
        const notes = await base44.asServiceRole.entities.JobNote.filter({ job_id: job.id }, "-created_date", 200);

        result = [
          ...audits.map((event) => ({
            id: `audit-${event.id}`,
            type: event.event_type,
            title: event.summary || "Job updated",
            detail: [event.previous_value, event.new_value].filter(Boolean).join(" → "),
            actor: event.actor_name || "System",
            visibility: event.visibility,
            date: event.created_date,
          })),
          ...notes.map((note) => ({
            id: `note-${note.id}`,
            type: "note",
            title: note.visibility === "customer" ? "Customer-visible note" : "Internal note",
            detail: note.body,
            actor: note.author_name || "Team member",
            visibility: note.visibility,
            date: note.created_date,
          })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      }
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    // Structured server-side error log — inspect in dashboard → Code → Functions → logs.
    console.error("[jobActions] request failed", JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    return Response.json({ error: error.message || "Something went wrong while updating this job. Please try again." }, { status: 500 });
  }
});
