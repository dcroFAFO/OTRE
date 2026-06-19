// Simple permission helpers for the admin > technician > customer hierarchy.

import { isStaffRole, hasCapability, hasAtLeastRole, normalizeRole } from "./roles";

const ACTION_PERMISSIONS = {
  admin: ["*"],
  technician: [
    "job.view.all",
    "job.create",
    "job.update",
    "job.status.change",
    "job.assign",
    "job.reschedule",
    "job.note.internal",
    "job.note.customer",
    "job.attach",
    "job.quote.manage",
    "job.invoice.manage",
    "job.payment.manage",
    "job.reopen",
    "job.checklist.update",
    "dashboard.view",
  ],
  customer: ["job.view.own", "quote.approve", "quote.reject", "customer.upload", "customer.message", "invoice.pay"],
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