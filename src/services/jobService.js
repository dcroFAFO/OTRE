import { base44 } from "@/api/base44Client";

// Thin frontend wrapper — all job business logic and audit logging runs
// server-side in functions/jobActions. The UI only displays the outcome.

const invoke = async (payload) => {
  const res = await base44.functions.invoke("jobActions", payload);
  return res.data;
};

export async function changeStatus(job, newStatus) {
  return invoke({ action: "change_status", jobId: job.id, newStatus });
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

export async function toggleChecklistItem(job, index) {
  return invoke({ action: "toggle_checklist", jobId: job.id, index });
}

export async function savePrivateNotes(job, privateNotes) {
  return base44.entities.Job.update(job.id, { private_notes: privateNotes || "" });
}

export async function addNote(job, { body, visibility }) {
  return invoke({ action: "add_note", jobId: job.id, body, visibility });
}

export async function addInventoryParts(job, parts) {
  return invoke({ action: "add_inventory_parts", jobId: job.id, parts });
}

export async function removeInventoryPart(job, usage) {
  return invoke({ action: "remove_inventory_part", jobId: job.id, usageId: usage.id });
}

export async function removeInventoryParts(job, usages) {
  return invoke({ action: "remove_inventory_parts", jobId: job.id, usageIds: usages.map((usage) => usage.id) });
}