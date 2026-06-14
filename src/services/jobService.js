import { invokeFn } from "@/lib/serviceClient";

// Thin frontend wrapper — all job business logic and audit logging runs
// server-side in functions/jobActions. The UI only displays the outcome.
// invokeFn throws a friendly error if the backend returns { error }.

const invoke = (payload) => invokeFn("jobActions", payload);

export async function changeStatus(job, newStatus) {
  return invoke({ action: "change_status", jobId: job.id, newStatus });
}

export async function assignTechnician(job, tech) {
  return invoke({
    action: "assign_technician",
    jobId: job.id,
    techId: tech?.id || null,
    techName: tech?.short_name || tech?.full_name || null,
  });
}

export async function rescheduleJob(job, newDate) {
  return invoke({ action: "reschedule", jobId: job.id, newDate });
}

export async function markReadyForPickup(job) {
  return invoke({ action: "mark_ready", jobId: job.id });
}

export async function cancelJob(job) {
  return invoke({ action: "cancel", jobId: job.id });
}

export async function reopenJob(job) {
  return invoke({ action: "reopen", jobId: job.id });
}

export async function archiveJob(job) {
  return invoke({ action: "archive", jobId: job.id });
}

export async function toggleChecklistItem(job, index) {
  return invoke({ action: "toggle_checklist", jobId: job.id, index });
}

export async function savePrivateNotes(job, privateNotes) {
  return invoke({ action: "save_private_notes", jobId: job.id, privateNotes });
}

export async function addNote(job, { body, visibility }) {
  return invoke({ action: "add_note", jobId: job.id, body, visibility });
}