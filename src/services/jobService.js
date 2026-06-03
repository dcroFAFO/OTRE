import { base44 } from "@/api/base44Client";
import { logAudit } from "./auditService";
import { getStatus } from "@/config/jobConfig";
import { CANCELLED_STATUS_KEY, COMPLETE_STATUS_KEY, DEFAULT_APP_SETTINGS, READY_STATUS_KEY, REOPEN_STATUS_KEY } from "@/config/platformConfig";

// All job mutations route through this service so audit events stay in sync.

export async function changeStatus(job, newStatus, actor) {
  if (job.status === newStatus) return job;
  const updated = await base44.entities.Job.update(job.id, { status: newStatus });
  await logAudit({
    eventType: "status_changed",
    jobId: job.id,
    actor,
    previousValue: getStatus(job.status).label,
    newValue: getStatus(newStatus).label,
    summary: `Status changed to "${getStatus(newStatus).label}"`,
    visibility: "customer",
  });
  return updated;
}

export async function assignTechnician(job, tech, actor) {
  const updated = await base44.entities.Job.update(job.id, {
    assigned_technician_id: tech?.id || null,
    assigned_technician_name: tech?.short_name || tech?.full_name || null,
  });
  await logAudit({
    eventType: "job_assigned",
    jobId: job.id,
    actor,
    newValue: tech?.short_name || tech?.full_name,
    summary: `${DEFAULT_APP_SETTINGS.terminology.staffAssignmentLabel} ${tech?.short_name || tech?.full_name || "—"} assigned`,
  });
  return updated;
}

export async function rescheduleJob(job, newDate, actor) {
  const updated = await base44.entities.Job.update(job.id, { scheduled_date: newDate });
  await logAudit({
    eventType: "job_rescheduled",
    jobId: job.id,
    actor,
    previousValue: job.scheduled_date,
    newValue: newDate,
    summary: `Rescheduled to ${newDate}`,
    visibility: "customer",
  });
  return updated;
}

export async function markReadyForPickup(job, actor) {
  const updated = await base44.entities.Job.update(job.id, {
    ready_for_pickup: true,
    status: READY_STATUS_KEY,
  });
  await logAudit({
    eventType: "ready_for_pickup",
    jobId: job.id,
    actor,
    summary: `Marked ${DEFAULT_APP_SETTINGS.terminology.readyStateLabel.toLowerCase()}`,
    visibility: "customer",
  });
  return updated;
}

export async function cancelJob(job, actor) {
  const updated = await base44.entities.Job.update(job.id, { status: CANCELLED_STATUS_KEY });
  await logAudit({ eventType: "job_cancelled", jobId: job.id, actor, summary: "Job cancelled", visibility: "customer" });
  return updated;
}

export async function reopenJob(job, actor) {
  const updated = await base44.entities.Job.update(job.id, { status: REOPEN_STATUS_KEY });
  await logAudit({ eventType: "job_reopened", jobId: job.id, actor, summary: "Job reopened" });
  return updated;
}

export async function archiveJob(job, actor) {
  const updated = await base44.entities.Job.update(job.id, { archived: true });
  await logAudit({ eventType: "job_archived", jobId: job.id, actor, summary: "Job archived" });
  return updated;
}

export async function addNote(job, { body, visibility }, actor) {
  const note = await base44.entities.JobNote.create({
    job_id: job.id,
    body,
    visibility,
    author_id: actor?.id,
    author_name: actor?.full_name || actor?.short_name,
    author_role: actor?.role,
  });
  await logAudit({
    eventType: visibility === "customer" ? "customer_note_added" : "note_added",
    jobId: job.id,
    actor,
    summary: visibility === "customer" ? "Customer-visible note added" : "Internal note added",
    visibility: visibility === "customer" ? "customer" : "internal",
  });
  return note;
}