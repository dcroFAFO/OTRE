import { base44 } from "@/api/base44Client";
import { fullName } from "@/config/crmConfig";

// ─── Activity logging (CRM timeline backbone) ───────────────────────────────
export async function logActivity({ relatedType, relatedId, activityType = "note", title, body, outcome, direction = "internal", actor, metadata = {} }) {
  const link = {};
  if (relatedType === "lead") link.lead_id = relatedId;
  if (relatedType === "contact") link.contact_id = relatedId;
  if (relatedType === "company") link.company_id = relatedId;
  if (relatedType === "deal") link.deal_id = relatedId;

  return base44.entities.CRMActivity.create({
    related_type: relatedType,
    related_id: relatedId,
    ...link,
    activity_type: activityType,
    title: title || "",
    body: body || "",
    outcome,
    direction,
    actor_id: actor?.id || null,
    actor_name: actor?.full_name || "System",
    activity_date: new Date().toISOString(),
    metadata,
  });
}

export async function listActivities(relatedType, relatedId, limit = 100) {
  return base44.entities.CRMActivity.filter({ related_type: relatedType, related_id: relatedId }, "-activity_date", limit);
}

// ─── Notes ──────────────────────────────────────────────────────────────────
export async function addNote({ relatedType, relatedId, body, actor, mentionedUserIds = [], privateNote = false }) {
  const note = await base44.entities.CRMNote.create({
    related_type: relatedType,
    related_id: relatedId,
    body,
    plain_text_body: body,
    author_id: actor?.id || null,
    author_name: actor?.full_name || "User",
    mentioned_user_ids: mentionedUserIds,
    private_note: privateNote,
  });
  await logActivity({ relatedType, relatedId, activityType: "note", title: "Note added", body, actor });
  return note;
}

export async function listNotes(relatedType, relatedId) {
  const notes = await base44.entities.CRMNote.filter({ related_type: relatedType, related_id: relatedId }, "-created_date", 100);
  return notes.filter((n) => !n.deleted);
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function createLead(data, actor) {
  const payload = { ...data, full_name: fullName(data), owner_id: data.owner_id || actor?.id };
  const lead = await base44.entities.CRMLead.create(payload);
  await logActivity({ relatedType: "lead", relatedId: lead.id, activityType: "system", title: "Lead created", actor });
  return lead;
}

export async function updateLead(id, data, actor) {
  const payload = { ...data };
  if (data.first_name !== undefined || data.last_name !== undefined) payload.full_name = fullName(data);
  const lead = await base44.entities.CRMLead.update(id, payload);
  return lead;
}

// Convert a lead into a contact (+ optional company), carry over source/tags/notes.
export async function convertLead(lead, { createCompany = true } = {}, actor) {
  let companyId = lead.converted_company_id || null;
  if (createCompany && lead.company_name && !companyId) {
    const existing = await base44.entities.CRMCompany.filter({ name: lead.company_name }, "-created_date", 1);
    if (existing[0]) companyId = existing[0].id;
    else {
      const company = await base44.entities.CRMCompany.create({
        name: lead.company_name,
        website: lead.website,
        industry: lead.industry,
        company_size: lead.company_size,
        owner_id: lead.owner_id || actor?.id,
        lifecycle_stage: "opportunity",
        tags: lead.tags || [],
      });
      companyId = company.id;
      await logActivity({ relatedType: "company", relatedId: company.id, activityType: "system", title: "Company created from lead conversion", actor });
    }
  }

  const contact = await base44.entities.CRMContact.create({
    first_name: lead.first_name,
    last_name: lead.last_name,
    full_name: fullName(lead),
    email: lead.email,
    phone: lead.phone,
    job_title: lead.job_title,
    company_id: companyId,
    company_name: lead.company_name,
    owner_id: lead.owner_id || actor?.id,
    lifecycle_stage: "sales_qualified_lead",
    lead_source: lead.lead_source,
    source_detail: lead.source_detail,
    score: lead.score,
    priority: lead.priority,
    tags: lead.tags || [],
  });

  await base44.entities.CRMLead.update(lead.id, {
    lead_status: "converted",
    converted_contact_id: contact.id,
    converted_company_id: companyId,
    converted_date: new Date().toISOString(),
  });

  await logActivity({ relatedType: "lead", relatedId: lead.id, activityType: "system", title: "Lead converted to contact", actor });
  await logActivity({ relatedType: "contact", relatedId: contact.id, activityType: "system", title: "Contact created from lead", actor });
  return { contact, companyId };
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
export async function createContact(data, actor) {
  const payload = { ...data, full_name: fullName(data), owner_id: data.owner_id || actor?.id };
  const contact = await base44.entities.CRMContact.create(payload);
  await logActivity({ relatedType: "contact", relatedId: contact.id, activityType: "system", title: "Contact created", actor });
  return contact;
}

export async function updateContact(id, data) {
  const payload = { ...data };
  if (data.first_name !== undefined || data.last_name !== undefined) payload.full_name = fullName(data);
  return base44.entities.CRMContact.update(id, payload);
}

// ─── Companies ────────────────────────────────────────────────────────────────
export async function createCompany(data, actor) {
  const payload = { ...data, owner_id: data.owner_id || actor?.id };
  if (payload.domain) payload.domain = normalizeDomain(payload.domain);
  const company = await base44.entities.CRMCompany.create(payload);
  await logActivity({ relatedType: "company", relatedId: company.id, activityType: "system", title: "Company created", actor });
  return company;
}

export async function updateCompany(id, data) {
  const payload = { ...data };
  if (payload.domain) payload.domain = normalizeDomain(payload.domain);
  return base44.entities.CRMCompany.update(id, payload);
}

// ─── Duplicate detection ──────────────────────────────────────────────────────
export async function findDuplicateContact({ email, phone }) {
  if (email) {
    const byEmail = await base44.entities.CRMContact.filter({ email }, "-created_date", 1);
    if (byEmail[0]) return byEmail[0];
  }
  if (phone) {
    const byPhone = await base44.entities.CRMContact.filter({ phone }, "-created_date", 1);
    if (byPhone[0]) return byPhone[0];
  }
  return null;
}

export async function findDuplicateCompany({ domain, name }) {
  if (domain) {
    const d = normalizeDomain(domain);
    const byDomain = await base44.entities.CRMCompany.filter({ domain: d }, "-created_date", 1);
    if (byDomain[0]) return byDomain[0];
  }
  if (name) {
    const byName = await base44.entities.CRMCompany.filter({ name }, "-created_date", 1);
    if (byName[0]) return byName[0];
  }
  return null;
}

export function normalizeDomain(d) {
  return (d || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

// ─── Scoped listing (respects view scope) ─────────────────────────────────────
export async function listScoped(entityName, scope, ownerId, filters = {}, limit = 200) {
  const query = { archived: false, ...filters };
  if (scope === "assigned" && ownerId) query.owner_id = ownerId;
  return base44.entities[entityName].filter(query, "-updated_date", limit);
}