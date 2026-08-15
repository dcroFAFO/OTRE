import { base44 } from "@/api/base44Client";
export { mergeClientHistoryPages } from "@/services/clientHistoryMerge";

// All admin client/customer management operations live here, split across three
// backend functions: customerRead (queries), customerWrite (mutations) and
// scooterActions (assets). Every change is logged to AuditEvent
// (event_type "customer_update") so the unified history timeline can surface
// status / tag / profile changes.

export async function listClients({ page = 1, limit = 50 } = {}) {
  const res = await base44.functions.invoke("customerRead", { action: "list", page, limit });
  if (res.data?.error) throw Object.assign(new Error(res.data.error), { status: res.status || 400, response: res });
  return {
    customers: res.data.customers || [],
    page: res.data.page || page,
    limit: res.data.limit || limit,
    pagination: res.data.pagination || { page, limit, has_more: false, next_page: null },
    partial: res.data.partial === true,
    potentially_truncated: res.data.potentially_truncated === true,
    truncation: res.data.truncation || {},
    query_failures: res.data.query_failures || [],
  };
}

export async function getClient(id) {
  const res = await base44.functions.invoke("customerRead", { action: "get", customer_id: id });
  return res.data.customer;
}

export async function searchClients(field, query) {
  const res = await base44.functions.invoke("customerRead", { action: "search", field, query });
  if (res.data?.error) throw Object.assign(new Error(res.data.error), { status: res.status || 400, response: res });
  return res.data.customers || [];
}

// Check if an email or phone already belongs to a DIFFERENT customer
export async function checkDuplicateContact(email, phone, excludeCustomerId) {
  const res = await base44.functions.invoke("customerRead", {
    action: "checkDuplicateContact",
    email,
    phone,
    exclude_customer_id: excludeCustomerId,
  });
  return res.data;
}

export async function deleteClients(ids) {
  const res = await base44.functions.invoke("customerWrite", { action: "delete", customer_ids: ids });
  return res.data;
}

// Bulk status / tag edits. Routed through the backend so each change is audited.
export async function bulkUpdateClients(ids, changes) {
  const res = await base44.functions.invoke("customerWrite", { action: "bulkUpdate", customer_ids: ids, changes });
  return res.data;
}

export async function resolveCustomerForJob(job) {
  const res = await base44.functions.invoke("customerWrite", { action: "resolveForJob", job_id: job?.id, job });
  return res.data.customer;
}

// Update profile fields with field-level audit summaries.
export async function updateClient(customer, changes, actor) {
  const res = await base44.functions.invoke("customerWrite", {
    action: "update",
    customer_id: customer.id,
    changes,
  });
  return res.data.customer;
}

// Internal notes (admin-only). Each is timestamped + author-stamped.
export async function listClientNotes(customerId) {
  const res = await base44.functions.invoke("customerRead", { action: "listNotes", customer_id: customerId });
  if (res.data?.error) throw Object.assign(new Error(res.data.error), { status: res.status || 400, response: res });
  return res.data.notes || [];
}

export async function updateClientReferral(customerId, changes) {
  const res = await base44.functions.invoke("customerWrite", { action: "updateReferral", customer_id: customerId, changes });
  if (res.data?.error) throw Object.assign(new Error(res.data.error), { status: res.status || 400, response: res });
  return res.data.customer;
}

export async function addClientNote(customer, body, actor) {
  const res = await base44.functions.invoke("customerWrite", { action: "addNote", customer_id: customer.id, body });
  if (res.data?.error) throw Object.assign(new Error(res.data.error), { status: res.status || 400, response: res });
  return res.data.note;
}

// Unified history from the backend (real records only).
export async function fetchClientHistory(customerId, { page = 1, limit = 50 } = {}) {
  const res = await base44.functions.invoke("customerHistory", {
    customer_id: customerId,
    page,
    limit,
  });
  if (res.data?.error) throw Object.assign(new Error(res.data.error), { status: res.status || 400, response: res });
  return res.data;
}

// ── Scooter / asset helpers ──────────────────────────────────────────────────

export async function listCustomerScooters(customerId) {
  if (!customerId) return [];
  const res = await base44.functions.invoke("scooterActions", { action: "listScooters", customer_id: customerId });
  return res.data.scooters || [];
}

export async function createScooter(customerId, data, actor) {
  const res = await base44.functions.invoke("scooterActions", { action: "saveScooter", customer_id: customerId, data });
  return res.data.scooter;
}

export async function updateScooter(scooterId, data, customerName, actor) {
  const res = await base44.functions.invoke("scooterActions", { action: "saveScooter", scooter_id: scooterId, customer_id: data.customer_id, data });
  return res.data.scooter;
}

export async function deleteScooter(scooterId, customerName, actor) {
  await base44.functions.invoke("scooterActions", { action: "deleteScooter", scooter_id: scooterId });
}

export async function archiveScooter(scooterId, reason = "Service history retained") {
  const res = await base44.functions.invoke("scooterActions", {
    action: "archiveScooter",
    scooter_id: scooterId,
    reason,
  });
  if (res.data?.error) throw Object.assign(new Error(res.data.error), { status: res.status || 400, response: res });
  return res.data.scooter;
}
