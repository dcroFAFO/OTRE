export const CANONICAL_ROLES = Object.freeze(['admin', 'customer']);
export const LEGACY_ADMIN_ROLES = new Set(['admin', 'staff', 'employee', 'technician']);
export const TRACKING_DAYS_AFTER_COMPLETION = 30;

export class IdentityConflictError extends Error {
  code: string;

  constructor(message: string, code = 'IDENTITY_CONFLICT') {
    super(message);
    this.name = 'IdentityConflictError';
    this.code = code;
  }
}

export function normalizeRoleValue(value: unknown): 'admin' | 'customer' {
  return LEGACY_ADMIN_ROLES.has(String(value || '').trim().toLowerCase()) ? 'admin' : 'customer';
}

// Only auth.me().role is trusted. user.data and other custom User fields are
// deliberately ignored because a customer-controlled profile value must never
// become an authorization claim.
export function authenticatedRole(user: any): 'admin' | 'customer' {
  return String(user?.role || '').trim().toLowerCase() === 'admin' ? 'admin' : 'customer';
}

export function isAdmin(user: any): boolean {
  return !!user?.id && authenticatedRole(user) === 'admin';
}

export function isCustomer(user: any): boolean {
  return !!user?.id && authenticatedRole(user) === 'customer';
}

export function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function normalizeAustralianMobile(value: unknown): string {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : '';
}

export function contactFingerprintInput(email: unknown, phone: unknown): string {
  return `${normalizeEmail(email)}|${normalizeAustralianMobile(phone)}`;
}

export function ownsCanonicalJob(customer: any, job: any): boolean {
  return !!customer?.id && !!job?.customer_account_id && job.customer_account_id === customer.id;
}

export function trackingExpiry(job: any, access: any): Date | null {
  const explicitValue = access?.expiresAt || access?.expires_at;
  const explicit = explicitValue ? new Date(explicitValue) : null;
  const explicitValid = explicit && Number.isFinite(explicit.getTime()) ? explicit : null;

  if (String(job?.status || '').toLowerCase() !== 'completed') return explicitValid;
  const completedValue = job?.completed_at;
  if (!completedValue) return new Date(0);
  const completed = new Date(completedValue);
  if (!Number.isFinite(completed.getTime())) return new Date(0);
  const policy = new Date(completed.getTime() + TRACKING_DAYS_AFTER_COMPLETION * 24 * 60 * 60 * 1000);
  return explicitValid && explicitValid.getTime() < policy.getTime() ? explicitValid : policy;
}

export function customerAccountDto(customer: any, user: any) {
  return {
    id: customer?.id || '',
    reference: customer?.customer_id || customer?.id || '',
    name: customer?.full_name || customer?.name || user?.full_name || '',
    email: normalizeEmail(user?.email || customer?.email),
    phone_e164: customer?.phone_e164 || '',
    status: customer?.status || 'active',
    referral_code: customer?.referral_code || '',
    referral_status: customer?.referral_status || 'none',
    referral_eligible: !!customer?.referral_eligible,
  };
}

export function customerJobDto(job: any) {
  return {
    id: job?.id || '',
    reference: job?.reference || '',
    status: job?.status || '',
    source: job?.source || '',
    service_type: job?.service_type || '',
    issue_description: job?.issue_description || job?.issueDescription || '',
    asset_label: job?.asset_label || job?.scooter_make_model || '',
    scheduled_date: job?.scheduled_date || null,
    preferred_time_window: job?.preferred_time_window || null,
    payment_status: job?.payment_status || 'unpaid',
    created_at: job?.created_at || job?.createdAt || job?.created_date || null,
    updated_at: job?.updatedAt || job?.updated_date || null,
    completed_at: job?.completed_at || null,
  };
}

export function staffCustomerDto(customer: any) {
  return {
    ...customerAccountDto(customer, null),
    user_id: customer?.user_id || '',
    email: normalizeEmail(customer?.email),
    phone: customer?.phone || '',
    phone_display: customer?.phone_display || '',
    tags: Array.isArray(customer?.tags) ? customer.tags : [],
    last_activity_date: customer?.last_activity_date || null,
    notes: customer?.notes || '',
    referral_notes: customer?.referral_notes || '',
  };
}

export function staffJobDto(job: any) {
  return { ...job };
}
