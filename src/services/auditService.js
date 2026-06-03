import { base44 } from "@/api/base44Client";

// Central audit logging. Every important mutation routes through here so the
// audit trail is never an afterthought.
export async function logAudit({
  eventType,
  jobId = null,
  actor = null,
  previousValue = null,
  newValue = null,
  summary = "",
  visibility = "internal",
  metadata = {},
}) {
  return base44.entities.AuditEvent.create({
    event_type: eventType,
    job_id: jobId,
    actor_id: actor?.id || null,
    actor_name: actor?.full_name || actor?.short_name || "System",
    actor_role: actor?.role || "system",
    previous_value: previousValue != null ? String(previousValue) : null,
    new_value: newValue != null ? String(newValue) : null,
    summary,
    visibility,
    metadata,
  });
}

export async function listJobAudit(jobId) {
  return base44.entities.AuditEvent.filter({ job_id: jobId }, "-created_date", 200);
}

export async function listRecentAudit(limit = 15) {
  return base44.entities.AuditEvent.list("-created_date", limit);
}