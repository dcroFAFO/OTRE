import { base44 } from "@/api/base44Client";
import { logAudit } from "@/services/auditService";
import { CLIENT_STATUS_MAP, CLIENT_TAG_MAP } from "@/config/clientConfig";

// All admin client/customer management operations live here.
// Every change is logged to AuditEvent (event_type "customer_update") so the
// unified history timeline can surface status / tag / profile changes.

export async function listClients() {
  const res = await base44.functions.invoke("customerActions", { action: "list" });
  return res.data.customers || [];
}

export async function getClient(id) {
  const res = await base44.functions.invoke("customerActions", { action: "get", customer_id: id });
  return res.data.customer;
}

export async function resolveCustomerForJob(job) {
  const res = await base44.functions.invoke("customerActions", { action: "resolveForJob", job_id: job?.id, job });
  return res.data.customer;
}

function tagLabels(tags = []) {
  return tags.map((t) => CLIENT_TAG_MAP[t]?.label || t).join(", ");
}

// Update profile fields with field-level audit summaries.
export async function updateClient(customer, changes, actor) {
  const res = await base44.functions.invoke("customerActions", {
    action: "update",
    customer_id: customer.id,
    changes,
  });
  return res.data.customer;
}

// Internal notes (admin-only). Each is timestamped + author-stamped.
export async function listClientNotes(customerId) {
  return base44.entities.CustomerNote.filter({ customer_id: customerId }, "-created_date", 200);
}

export async function addClientNote(customer, body, actor) {
  const note = await base44.entities.CustomerNote.create({
    customer_id: customer.id,
    body,
    author_id: actor?.id || null,
    author_name: actor?.full_name || "Admin",
  });
  await base44.entities.Customer.update(customer.id, { last_activity_date: new Date().toISOString() }).catch(() => null);
  await logAudit({ 
    eventType: "customer_update",
    actor,
    summary: `${customer.full_name}: internal note added`,
    metadata: { customer_id: customer.id },
  });
  return note;
}

// Unified history from the backend (real records only).
export async function fetchClientHistory(customerId) {
  const res = await base44.functions.invoke("customerHistory", { customer_id: customerId });
  return res.data;
}

// ── Scooter / asset helpers ──────────────────────────────────────────────────

export async function listCustomerScooters(customerId) {
  if (!customerId) return [];
  return base44.entities.Scooter.filter({ customer_id: customerId }, "make", 100);
}

export async function createScooter(customerId, data, actor) {
  const res = await base44.functions.invoke("customerActions", { action: "saveScooter", customer_id: customerId, data });
  return res.data.scooter;
}

export async function updateScooter(scooterId, data, customerName, actor) {
  const res = await base44.functions.invoke("customerActions", { action: "saveScooter", scooter_id: scooterId, customer_id: data.customer_id, data });
  return res.data.scooter;
}

export async function deleteScooter(scooterId, customerName, actor) {
  await base44.functions.invoke("customerActions", { action: "deleteScooter", scooter_id: scooterId });
}

// Check if an email or phone already belongs to a DIFFERENT customer
export async function checkDuplicateContact(email, phone, excludeCustomerId) {
  const res = await base44.functions.invoke("customerActions", {
    action: "checkDuplicateContact",
    email,
    phone,
    exclude_customer_id: excludeCustomerId,
  });
  return res.data;
}