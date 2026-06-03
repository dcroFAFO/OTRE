// Modular permission map. Not hard-coded into UI components — components call
// can(role, action) instead of checking roles inline.

const PERMISSIONS = {
  admin: ["*"],
  employee: [
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
    "job.cancel",
    "job.reopen",
    "job.archive",
    "calendar.manage",
    "dashboard.view",
  ],
  technician: [
    "job.view.assigned",
    "job.status.change",
    "job.note.internal",
    "job.note.customer",
    "job.attach",
    "job.checklist.update",
    "dashboard.view",
  ],
  customer: [
    "job.view.own",
    "quote.approve",
    "quote.reject",
    "customer.upload",
    "customer.message",
    "invoice.pay",
  ],
};

export function can(role, action) {
  if (!role) return false;
  const perms = PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(action);
}

export function isStaff(role) {
  return ["admin", "employee", "technician"].includes(role);
}