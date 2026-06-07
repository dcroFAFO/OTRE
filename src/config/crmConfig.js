// Central CRM configuration: statuses, sources, lifecycle, permissions.
// Reuses existing app role keys (admin / employee / technician / customer).

export const LEAD_STATUSES = [
  { key: "new", label: "New", color: "slate" },
  { key: "attempted_contact", label: "Attempted", color: "amber" },
  { key: "contacted", label: "Contacted", color: "violet" },
  { key: "qualified", label: "Qualified", color: "emerald" },
  { key: "unqualified", label: "Unqualified", color: "rose" },
  { key: "converted", label: "Converted", color: "accent" },
  { key: "lost", label: "Lost", color: "rose" },
];

export const LIFECYCLE_STAGES = [
  { key: "subscriber", label: "Subscriber" },
  { key: "lead", label: "Lead" },
  { key: "marketing_qualified_lead", label: "MQL" },
  { key: "sales_qualified_lead", label: "SQL" },
  { key: "opportunity", label: "Opportunity" },
  { key: "customer", label: "Customer" },
  { key: "evangelist", label: "Evangelist" },
  { key: "other", label: "Other" },
];

export const LEAD_SOURCES = [
  { key: "website", label: "Website" },
  { key: "referral", label: "Referral" },
  { key: "social_media", label: "Social Media" },
  { key: "paid_ads", label: "Paid Ads" },
  { key: "organic_search", label: "Organic Search" },
  { key: "email_campaign", label: "Email Campaign" },
  { key: "event", label: "Event" },
  { key: "cold_outreach", label: "Cold Outreach" },
  { key: "partner", label: "Partner" },
  { key: "manual_entry", label: "Manual Entry" },
  { key: "other", label: "Other" },
];

export const PRIORITIES = [
  { key: "low", label: "Low", color: "slate" },
  { key: "medium", label: "Medium", color: "violet" },
  { key: "high", label: "High", color: "amber" },
  { key: "urgent", label: "Urgent", color: "rose" },
];

export const CONTACT_STATUSES = [
  { key: "active", label: "Active", color: "emerald" },
  { key: "inactive", label: "Inactive", color: "slate" },
  { key: "do_not_contact", label: "Do Not Contact", color: "rose" },
  { key: "bounced", label: "Bounced", color: "amber" },
  { key: "unsubscribed", label: "Unsubscribed", color: "rose" },
];

export const COMPANY_TYPES = [
  { key: "prospect", label: "Prospect", color: "violet" },
  { key: "partner", label: "Partner", color: "accent" },
  { key: "customer", label: "Customer", color: "emerald" },
  { key: "vendor", label: "Vendor", color: "slate" },
  { key: "competitor", label: "Competitor", color: "rose" },
  { key: "other", label: "Other", color: "slate" },
];

export const ACTIVITY_TYPES = [
  { key: "note", label: "Note", icon: "StickyNote" },
  { key: "call", label: "Call", icon: "Phone" },
  { key: "email", label: "Email", icon: "Mail" },
  { key: "sms", label: "SMS", icon: "MessageSquare" },
  { key: "meeting", label: "Meeting", icon: "Calendar" },
  { key: "task", label: "Task", icon: "CheckSquare" },
  { key: "status_change", label: "Status Change", icon: "RefreshCw" },
  { key: "deal_stage_change", label: "Stage Change", icon: "GitBranch" },
  { key: "assignment_change", label: "Assignment", icon: "UserPlus" },
  { key: "file_upload", label: "File", icon: "Paperclip" },
  { key: "form_submission", label: "Form", icon: "FileText" },
  { key: "automation", label: "Automation", icon: "Zap" },
  { key: "system", label: "System", icon: "Settings" },
];

export const CALL_OUTCOMES = [
  { key: "completed", label: "Completed" },
  { key: "no_answer", label: "No Answer" },
  { key: "left_voicemail", label: "Left Voicemail" },
  { key: "interested", label: "Interested" },
  { key: "not_interested", label: "Not Interested" },
  { key: "follow_up_needed", label: "Follow-up Needed" },
  { key: "booked_meeting", label: "Booked Meeting" },
  { key: "other", label: "Other" },
];

// CRM permission map keyed on existing app roles.
// admin = full; employee = manage all; technician = sales-rep style (own records); customer = none.
export const CRM_PERMISSIONS = {
  admin: ["*"],
  employee: ["crm.view.all", "crm.create", "crm.update.all", "crm.assign", "crm.convert", "crm.export", "crm.activity.log", "crm.archive"],
  technician: ["crm.view.assigned", "crm.create", "crm.update.own", "crm.convert", "crm.activity.log"],
  customer: [],
};

export function crmCan(role, action) {
  if (!role) return false;
  const perms = CRM_PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(action);
}

export function crmHasAccess(role) {
  return ["admin", "employee", "technician"].includes(role);
}

// Whether a role can view all records or only owned/assigned ones.
export function crmViewScope(role) {
  if (role === "admin" || role === "employee") return "all";
  if (role === "technician") return "assigned";
  return "none";
}

// Helper lookups
const byKey = (list) => Object.fromEntries(list.map((x) => [x.key, x]));
export const LEAD_STATUS_MAP = byKey(LEAD_STATUSES);
export const LIFECYCLE_MAP = byKey(LIFECYCLE_STAGES);
export const SOURCE_MAP = byKey(LEAD_SOURCES);
export const PRIORITY_MAP = byKey(PRIORITIES);
export const CONTACT_STATUS_MAP = byKey(CONTACT_STATUSES);
export const COMPANY_TYPE_MAP = byKey(COMPANY_TYPES);

export function fullName(rec) {
  if (rec?.full_name) return rec.full_name;
  return [rec?.first_name, rec?.last_name].filter(Boolean).join(" ") || rec?.email || "Unnamed";
}