// UI capability helpers for the canonical admin/customer role model.

import { isStaffRole, hasCapability, hasAtLeastRole, normalizeRole } from "./roles";

const ACTION_PERMISSIONS = {
  admin: ["*"],
  customer: ["job.view.own", "customer.upload", "customer.message"],
};

export function can(role, action) {
  const normalizedRole = normalizeRole(role);
  const permissions = ACTION_PERMISSIONS[normalizedRole] || [];
  return permissions.includes("*") || permissions.includes(action);
}

export function isStaff(role) {
  return isStaffRole(role);
}

export { hasCapability, hasAtLeastRole };
