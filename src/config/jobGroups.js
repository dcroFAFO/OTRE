// Job navigation groups used by the Jobs nav dropdown and the Jobs list page.
// Each group maps to a set of job status keys. "all" shows everything.
import { JOB_STATUSES } from "@/config/jobConfig";

export const JOB_GROUPS = [
  { key: "all", label: "All", statuses: null },
  { key: "new", label: "New Jobs", statuses: ["requested", "pending_confirmation"] },
  { key: "quotes", label: "Quotes", statuses: ["quote_required", "quote_sent", "quote_approved"] },
  {
    key: "in_progress",
    label: "In Progress",
    statuses: ["active", "booked", "technician_assigned", "repair_in_progress"],
  },
  { key: "completed", label: "Completed", statuses: ["ready_for_pickup", "completed", "paid"] },
  {
    key: "on_hold",
    label: "On Hold",
    statuses: [
      "on_hold",
      "waiting_customer",
      "waiting_technician",
      "waiting_supplier",
      "waiting_parts",
    ],
  },
];

// Anything not explicitly captured by another group falls into "Other".
const CAPTURED = new Set(
  JOB_GROUPS.flatMap((g) => g.statuses || [])
);

export const OTHER_GROUP = {
  key: "other",
  label: "Other",
  statuses: JOB_STATUSES.map((s) => s.key).filter((k) => !CAPTURED.has(k)),
};

export const ALL_JOB_GROUPS = [
  JOB_GROUPS[0],
  ...JOB_GROUPS.slice(1),
  OTHER_GROUP,
];

export function getJobGroup(key) {
  return ALL_JOB_GROUPS.find((g) => g.key === key) || ALL_JOB_GROUPS[0];
}

export function jobMatchesGroup(job, groupKey) {
  const group = getJobGroup(groupKey);
  if (!group.statuses) return true; // "all"
  return group.statuses.includes(job.status);
}