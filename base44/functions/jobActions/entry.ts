import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import {
  READY_STATUS,
  CANCELLED_STATUS,
  REOPEN_STATUS,
  INVOICE_OUTSTANDING_STATUS,
  normalizeStatus,
  isCanonicalStatus,
  statusLabel,
} from '../../shared/jobLifecycle.ts';
import { findCanonicalCustomer } from '../../shared/identityAuth.ts';
import { authenticatedRole, isAdmin, ownsCanonicalJob } from '../../shared/identityPolicy.ts';

// All job mutations (status, scheduling, checklist, notes) run
// server-side here, with audit events written in the same request.
// The status vocabulary lives in shared/jobLifecycle.ts — never redefine it here.

const PARTS_MARKUP_PERCENT = 20;
const PARTS_MARKUP_MULTIPLIER = 1.2;

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const customerPriceFromCost = (cost) => roundMoney((Number(cost) || 0) * PARTS_MARKUP_MULTIPLIER);

const enqueueJobNotification = async (base44, job, eventType) => {
  const version = String(job.updated_date || job.updatedAt || new Date().toISOString());
  const eventKey = `${eventType}:${job.id}:${version}`;
  const existing = await base44.asServiceRole.entities.NotificationEvent.filter({ event_key: eventKey }, "-created_date", 1).catch(() => []);
  if (existing[0]) return existing[0];
  try {
    return await base44.asServiceRole.entities.NotificationEvent.create({
      event_key: eventKey,
      related_entity_type: "Job",
      related_entity_id: job.id,
      job_id: job.id,
      customer_id: job.customer_id || "",
      customer_account_id: job.customer_account_id || "",
      event_version: version,
      event_data: { job_id: job.id },
      source: "manual",
      status: "pending",
      occurred_at: new Date().toISOString(),
    });
  } catch {
    const raced = await base44.asServiceRole.entities.NotificationEvent.filter({ event_key: eventKey }, "-created_date", 1).catch(() => []);
    return raced[0] || null;
  }
};

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

const listJobPartUsages = (base44, job) =>
  base44.asServiceRole.entities.InventoryUsage.filter({ job_id: job.id, source: "inventory" }, "-created_date", 100);

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
  const requestMeta: any = { fn: "jobActions" };
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

    const isStaff = isAdmin(user);
    const customer = isStaff ? null : await findCanonicalCustomer(base44.asServiceRole.entities, user.id);
    const ownsJob = ownsCanonicalJob(customer, job);
    if (!isStaff && !ownsJob) return Response.json({ error: "Job not found" }, { status: 404 });

    const STAFF_ONLY_ACTIONS = [
      "change_status", "reschedule", "mark_ready", "cancel", "reopen", "toggle_checklist",
      "save_private_notes", "add_inventory_parts", "remove_inventory_part", "remove_inventory_parts",
      "generate_and_send_invoice", "archive",
    ];
    if (STAFF_ONLY_ACTIONS.includes(action) && !isStaff) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const logAudit = ({ eventType, previousValue = null, newValue = null, summary = "", visibility = "internal", metadata = {} }) =>
      base44.asServiceRole.entities.AuditEvent.create({
        event_type: eventType,
        job_id: job.id,
        customer_id: job.customer_id,
        customer_account_id: job.customer_account_id || '',
        actor_id: user.id,
        actor_name: user.full_name || "System",
        actor_role: authenticatedRole(user),
        outcome: "succeeded",
        previous_value: previousValue != null ? String(previousValue) : null,
        new_value: newValue != null ? String(newValue) : null,
        summary,
        visibility,
        metadata,
      });

    let result;

    switch (action) {
      case "change_status": {
        const nextStatus = normalizeStatus(params.newStatus);
        const currentStatus = normalizeStatus(job.status);
        if (!isCanonicalStatus(nextStatus)) {
          return Response.json({ error: `Invalid job status: ${params.newStatus}` }, { status: 400 });
        }
        if (currentStatus === nextStatus && job.status === nextStatus) { result = job; break; }
        result = await base44.asServiceRole.entities.Job.update(job.id, {
          status: nextStatus,
          ...(nextStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
        });
        await logAudit({
          eventType: "status_changed",
          previousValue: statusLabel(currentStatus),
          newValue: statusLabel(nextStatus),
          summary: `Status changed to "${statusLabel(nextStatus)}"`,
          visibility: "customer",
        });
        const notificationType = nextStatus === "scheduled" || nextStatus === "booked"
          ? "job_scheduled"
          : nextStatus === "repair_in_progress"
          ? "repair_started"
          : nextStatus === "ready_for_pickup"
          ? "repair_completed"
          : "";
        if (notificationType) {
          await enqueueJobNotification(base44, result, notificationType).catch(() => null);
          await base44.functions.invoke("processNotificationOutbox", {}).catch(() => null);
        }
        break;
      }
      // Explicit technician step: pull any uninvoiced parts onto the invoice,
      // make it customer-visible and move the job to Invoice Outstanding.
      // Invoicing is deliberately NOT automatic on ready_for_pickup.
      case "generate_and_send_invoice": {
        const invoiceSync = await addUninvoicedPartsToInvoice(base44, job);
        if (!invoiceSync.invoice) {
          return Response.json({ error: "Create an invoice for this job before sending it." }, { status: 400 });
        }
        if (invoiceSync.addedCount > 0) {
          await logAudit({
            eventType: "parts_added_to_invoice",
            summary: `Added ${invoiceSync.addedCount} part(s) to the invoice`,
            visibility: "internal",
          });
        }
        const visible = await makeInvoiceCustomerVisible(base44, job);
        const previousStatus = normalizeStatus(job.status);
        result = await base44.asServiceRole.entities.Job.update(job.id, { status: INVOICE_OUTSTANDING_STATUS });
        await logAudit({
          eventType: "invoice_sent_to_customer",
          previousValue: statusLabel(previousStatus),
          newValue: statusLabel(INVOICE_OUTSTANDING_STATUS),
          summary: "Invoice generated and sent to the customer",
          visibility: "customer",
        });
        result = { ...result, invoice: visible.invoice };
        break;
      }
      case "reschedule": {
        if (!params.newDate || job.scheduled_date === params.newDate) { result = job; break; }
        result = await base44.asServiceRole.entities.Job.update(job.id, { scheduled_date: params.newDate });
        await logAudit({
          eventType: job.scheduled_date ? "job_rescheduled" : "job_scheduled",
          previousValue: job.scheduled_date,
          newValue: params.newDate,
          summary: `${job.scheduled_date ? "Rescheduled" : "Scheduled"} to ${params.newDate}`,
          visibility: "customer",
        });
        if (normalizeStatus(result.status) === "scheduled") {
          await enqueueJobNotification(base44, result, "job_scheduled").catch(() => null);
          await base44.functions.invoke("processNotificationOutbox", {}).catch(() => null);
        }
        break;
      }
      case "mark_ready": {
        if (normalizeStatus(job.status) === READY_STATUS && job.ready_for_pickup) { result = job; break; }
        result = await base44.asServiceRole.entities.Job.update(job.id, { ready_for_pickup: true, status: READY_STATUS });
        await logAudit({ eventType: "ready_for_pickup", summary: "Marked ready for pickup", visibility: "customer" });
        await enqueueJobNotification(base44, result, "repair_completed").catch(() => null);
        await base44.functions.invoke("processNotificationOutbox", {}).catch(() => null);
        break;
      }
      case "cancel": {
        if (normalizeStatus(job.status) === CANCELLED_STATUS) { result = job; break; }
        result = await base44.asServiceRole.entities.Job.update(job.id, { status: CANCELLED_STATUS });
        await logAudit({ eventType: "job_cancelled", summary: "Job cancelled", visibility: "customer" });
        break;
      }
      case "reopen": {
        result = await base44.asServiceRole.entities.Job.update(job.id, { status: REOPEN_STATUS });
        await logAudit({ eventType: "job_reopened", summary: "Job reopened" });
        break;
      }
      case "archive": {
        if (job.archived_at) { result = job; break; }
        const now = new Date().toISOString();
        result = await base44.asServiceRole.entities.Job.update(job.id, {
          archived_at: now,
          archived_by_user_id: user.id,
          archive_reason: String(params.reason || "Archived from job management").trim().slice(0, 500),
        });
        await logAudit({
          eventType: "job_archived",
          summary: "Job archived; linked records and customer history retained",
          visibility: "internal",
        });
        break;
      }
      case "toggle_checklist": {
        const index = Number(params.index);
        const checklist = (job.checklist || []).map((c, i) => (i === index ? { ...c, done: !c.done } : c));
        result = await base44.asServiceRole.entities.Job.update(job.id, { checklist });
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
        if (!isStaff && !ownsJob) return Response.json({ error: "Forbidden" }, { status: 403 });
        const body = String(params.body || "").trim().slice(0, 5000);
        if (!body) return Response.json({ error: "Note text is required" }, { status: 400 });
        const visibility = isStaff && params.visibility === "internal" ? "internal" : "customer";
        result = await base44.asServiceRole.entities.JobNote.create({
          job_id: job.id,
          body,
          visibility,
          author_id: user.id,
          author_name: user.full_name,
          author_role: authenticatedRole(user),
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
          if (usage.job_id !== job.id) {
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
        if (!isStaff && !ownsJob) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const auditList = await base44.asServiceRole.entities.AuditEvent.filter({ job_id: job.id }, "-created_date", 200);
        const audits = auditList
          .filter((event) => isStaff || event.visibility === "customer")
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
          ...notes.filter((note) => isStaff || note.visibility === "customer").map((note) => ({
            id: `note-${note.id}`,
            type: "note",
            title: note.visibility === "customer" ? "Customer-visible note" : "Internal note",
            detail: note.body,
            actor: note.author_name || "Team member",
            visibility: note.visibility,
            date: note.created_date,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
