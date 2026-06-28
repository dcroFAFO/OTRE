// Configuration for the admin customer management system.
// Reuses the app's existing badge tones (slate/violet/amber/emerald/rose/accent).

export const CLIENT_STATUSES = [
  { key: "active", label: "Active", color: "emerald" },
  { key: "pending", label: "Pending", color: "amber" },
  { key: "in_review", label: "In Review", color: "violet" },
  { key: "onboarding", label: "Onboarding", color: "accent" },
  { key: "needs_follow_up", label: "Needs Follow Up", color: "amber" },
  { key: "inactive", label: "Inactive", color: "slate" },
  { key: "suspended", label: "Suspended", color: "rose" },
  { key: "closed", label: "Closed", color: "slate" },
];

export const CLIENT_TAGS = [
  { key: "vip", label: "VIP", color: "accent" },
  { key: "active_client", label: "Active Customer", color: "emerald" },
  { key: "past_client", label: "Past Customer", color: "slate" },
  { key: "high_priority", label: "High Priority", color: "rose" },
  { key: "needs_attention", label: "Needs Attention", color: "amber" },
];

const byKey = (list) => Object.fromEntries(list.map((x) => [x.key, x]));
export const CLIENT_STATUS_MAP = byKey(CLIENT_STATUSES);
export const CLIENT_TAG_MAP = byKey(CLIENT_TAGS);