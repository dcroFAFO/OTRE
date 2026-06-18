// Permission helpers. This module now delegates to the central role hierarchy
// in config/roles.js. The legacy `can()` / `isStaff()` API is preserved so
// existing imports keep working, while new code should prefer the richer
// capability helpers exported from config/roles.js.
import { DEFAULT_ROLE_PERMISSIONS } from "./platformConfig";
import {
  isStaffRole,
  hasCapability,
  hasAtLeastRole,
  normalizeRole,
} from "./roles";

const PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

// Legacy action-based check (job.* / quote.* etc). Owner & admin get "*".
export function can(role, action) {
  if (!role) return false;
  const normalized = normalizeRole(role);
  // owner/admin always allowed
  if (hasAtLeastRole(normalized, "admin")) return true;
  const perms = PERMISSIONS[role] || PERMISSIONS[normalized] || [];
  return perms.includes("*") || perms.includes(action);
}

export function isStaff(role) {
  return isStaffRole(role);
}

// Re-export the central capability helpers for convenience.
export { hasCapability, hasAtLeastRole, normalizeRole };