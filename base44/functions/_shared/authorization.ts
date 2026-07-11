export const STAFF_ROLES = new Set(["admin", "employee", "technician", "staff"]);

type UserRecord = Record<string, unknown> & { data?: Record<string, unknown> };
type DataRecord = Record<string, unknown>;

export type AuthorizationDecision = {
  allowed: boolean;
  reason: string;
};

function normalized(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function identifier(value: unknown): string {
  return String(value || "").trim();
}

export function userRole(user: UserRecord | null | undefined): string {
  return normalized(user?.role);
}

export function isStaffUser(user: UserRecord | null | undefined): boolean {
  return !!user?.id && STAFF_ROLES.has(userRole(user));
}

export function isAdminUser(user: UserRecord | null | undefined): boolean {
  return !!user?.id && userRole(user) === "admin";
}

export function authorizeStaff(user: UserRecord | null | undefined): AuthorizationDecision {
  if (!user?.id) return { allowed: false, reason: "unauthenticated" };
  if (!isStaffUser(user)) return { allowed: false, reason: "staff_required" };
  return { allowed: true, reason: "staff" };
}

function userCustomerIdentifiers(user: UserRecord): Set<string> {
  return new Set([
    user.customer_id,
    user.customerId,
    user.customer_account_id,
    user.data?.customer_id,
    user.data?.customerId,
    user.data?.customer_account_id,
  ].map(identifier).filter(Boolean));
}

function recordCustomerIdentifiers(invoice: DataRecord, job: DataRecord | null): Set<string> {
  return new Set([
    invoice.customer_id,
    invoice.customerId,
    invoice.customer_account_id,
    job?.customer_id,
    job?.customerId,
    job?.customer_account_id,
  ].map(identifier).filter(Boolean));
}

export function authorizeInvoiceCheckout(
  user: UserRecord | null | undefined,
  invoice: DataRecord | null | undefined,
  job: DataRecord | null = null,
): AuthorizationDecision {
  if (!user?.id) return { allowed: false, reason: "unauthenticated" };
  if (!invoice?.id) return { allowed: false, reason: "invoice_missing" };
  if (invoice.job_id && (!job?.id || identifier(job.id) !== identifier(invoice.job_id))) {
    return { allowed: false, reason: "record_mismatch" };
  }
  if (isStaffUser(user)) return { allowed: true, reason: "staff" };
  if (invoice.invoiceVisibility !== "customer_visible") {
    return { allowed: false, reason: "invoice_not_visible" };
  }

  const userId = identifier(user.id);
  const linkedUserIds = [
    invoice.customer_user_id,
    job?.customer_user_id,
    job?.user_id,
  ].map(identifier).filter(Boolean);
  if (linkedUserIds.includes(userId)) return { allowed: true, reason: "owner_user" };

  const userCustomerIds = userCustomerIdentifiers(user);
  const recordCustomerIds = recordCustomerIdentifiers(invoice, job);
  if ([...recordCustomerIds].some((value) => userCustomerIds.has(value))) {
    return { allowed: true, reason: "owner_customer" };
  }

  const userEmail = normalized(user.email);
  const jobEmail = normalized(job?.customer_email);
  if (userEmail && jobEmail && userEmail === jobEmail) {
    return { allowed: true, reason: "owner_email" };
  }

  return { allowed: false, reason: "not_owner" };
}
