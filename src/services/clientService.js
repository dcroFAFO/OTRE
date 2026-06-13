import { base44 } from "@/api/base44Client";
import { logAudit } from "@/services/auditService";
import { CLIENT_STATUS_MAP, CLIENT_TAG_MAP } from "@/config/clientConfig";

// All admin client/customer management operations live here.
// Every change is logged to AuditEvent (event_type "customer_update") so the
// unified history timeline can surface status / tag / profile changes.

export async function listClients() {
  return base44.entities.Customer.list("-updated_date", 500);
}

export async function getClient(id) {
  return base44.entities.Customer.get(id);
}

function tagLabels(tags = []) {
  return tags.map((t) => CLIENT_TAG_MAP[t]?.label || t).join(", ");
}

// Update profile fields with field-level audit summaries.
export async function updateClient(customer, changes, actor) {
  const updated = await base44.entities.Customer.update(customer.id, {
    ...changes,
    last_activity_date: new Date().toISOString(),
  });

  // Build a readable summary of what changed
  const parts = [];
  if (changes.status && changes.status !== customer.status) {
    parts.push(`status → ${CLIENT_STATUS_MAP[changes.status]?.label || changes.status}`);
  }
  if (changes.tags && JSON.stringify(changes.tags) !== JSON.stringify(customer.tags || [])) {
    parts.push(`tags → ${tagLabels(changes.tags) || "none"}`);
  }
  ["full_name", "email", "phone"].forEach((f) => {
    if (changes[f] !== undefined && changes[f] !== customer[f]) parts.push(`${f.replace(/_/g, " ")} updated`);
  });

  if (parts.length) {
    await logAudit({
      eventType: "customer_update",
      actor,
      summary: `${customer.full_name}: ${parts.join(", ")}`,
      metadata: { customer_id: customer.id },
    });
  }
  return updated;
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
  await base44.entities.Customer.update(customer.id, { last_activity_date: new Date().toISOString() });
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