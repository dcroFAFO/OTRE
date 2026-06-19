// Permission helpers. Delegates to the central role hierarchy in config/roles.js.

import { DEFAULT_ROLE_PERMISSIONS } from "./platformConfig";
import { isStaffRole, hasCapability, hasAtLeastRole } from "./roles";

const PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

// Legacy action-based check (job.* / quote.* etc). Owner & admin get "*".
export function can(role, action) {
  if (!role) return false;
  if (hasAtLeastRole(role, "admin")) return true;
  const perms = PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(action);
}

export function isStaff(role) {
  return isStaffRole(role);
}

// Re-export the central capability helpers for convenience.
export { hasCapability, hasAtLeastRole };