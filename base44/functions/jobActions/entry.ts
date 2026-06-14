import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// All job mutations (status, assignment, scheduling, checklist, notes) run
// server-side here, with audit events written in the same request.

const READY_STATUS = "ready_for_pickup";
const CANCELLED_STATUS = "cancelled";
const REOPEN_STATUS = "active";

const statusLabel = (key) =>
  String(key || "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

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

    // Service-role client for DB writes. Authorization is enforced in code
    // below; the entity-level RLS restricts direct SDK writes to staff, so all
    // legitimate mutations (including customer note-adds) go through here.
    const db = base44.asServiceRole.entities;

    const jobs = await db.Job.filter({ id: jobId }, "", 1);
    const job = jobs[0];
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    // Authorization: staff can do everything. A customer may ONLY add a
    // customer-visible note, and only on a job that belongs to them (by email).
    const STAFF_ROLES = ["admin", "employee", "technician"];
    const isStaffUser = STAFF_ROLES.includes(user.role);
    if (!isStaffUser) {
      const ownsJob = job.customer_email && user.email &&
        job.customer_email.toLowerCase() === user.email.toLowerCase();
      const isAllowedCustomerAction = action === "add_note" && params.visibility === "customer";
      if (!ownsJob || !isAllowedCustomerAction) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const logAudit = ({ eventType, previousValue = null, newValue = null, summary = "", visibility = "internal", metadata = {} }) =>
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
        metadata,
      });

    let result;

    switch (action) {
      case "change_status": {
        if (job.status === params.newStatus) { result = job; break; }
        result = await db.Job.update(job.id, { status: params.newStatus });
        await logAudit({
          eventType: "status_changed",
          previousValue: statusLabel(job.status),
          newValue: statusLabel(params.newStatus),
          summary: `Status changed to "${statusLabel(params.newStatus)}"`,
          visibility: "customer",
        });
        break;
      }
      case "assign_technician": {
        const { techId = null, techName = null } = params;
        result = await db.Job.update(job.id, {
          assigned_technician_id: techId,
          assigned_technician_name: techName,
        });
        await logAudit({
          eventType: "job_assigned",
          newValue: techName,
          summary: `Technician ${techName || "—"} assigned`,
        });
        break;
      }
      case "reschedule": {
        result = await db.Job.update(job.id, { scheduled_date: params.newDate });
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
        result = await db.Job.update(job.id, { ready_for_pickup: true, status: READY_STATUS });
        await logAudit({ eventType: "ready_for_pickup", summary: "Marked ready for pickup", visibility: "customer" });
        break;
      }
      case "cancel": {
        result = await db.Job.update(job.id, { status: CANCELLED_STATUS });
        await logAudit({ eventType: "job_cancelled", summary: "Job cancelled", visibility: "customer" });
        break;
      }
      case "reopen": {
        result = await db.Job.update(job.id, { status: REOPEN_STATUS });
        await logAudit({ eventType: "job_reopened", summary: "Job reopened" });
        break;
      }
      case "archive": {
        result = await db.Job.update(job.id, { archived: true });
        await logAudit({ eventType: "job_archived", summary: "Job archived" });
        break;
      }
      case "toggle_checklist": {
        const index = Number(params.index);
        const checklist = (job.checklist || []).map((c, i) => (i === index ? { ...c, done: !c.done } : c));
        result = await db.Job.update(job.id, { checklist });
        const item = checklist[index];
        await logAudit({
          eventType: "checklist_updated",
          summary: `Checklist item "${item?.label}" marked ${item?.done ? "done" : "not done"}`,
        });
        break;
      }
      case "save_private_notes": {
        result = await db.Job.update(job.id, { private_notes: params.privateNotes });
        await logAudit({ eventType: "private_notes_updated", summary: "Private notes updated", visibility: "internal" });
        break;
      }
      case "add_note": {
        const { body, visibility } = params;
        result = await db.JobNote.create({
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
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    // Structured server-side error log — inspect in dashboard → Code → Functions → logs.
    console.error("[jobActions] request failed", JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    // Safe, friendly message — internal details stay in the server logs.
    return Response.json({ error: "Something went wrong while updating this job. Please try again." }, { status: 500 });
  }
});