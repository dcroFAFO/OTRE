// Modular permission helpers; defaults are seeded into Role/Permission entities.
import { DEFAULT_ROLE_PERMISSIONS, STAFF_ROLE_KEYS } from "./platformConfig";

const PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

export function can(role, action) {
  if (!role) return false;
  const perms = PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(action);
}

export function isStaff(role) {
  return STAFF_ROLE_KEYS.includes(role);
}