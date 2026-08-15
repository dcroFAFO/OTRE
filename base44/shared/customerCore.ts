import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import { authenticatedRole, isAdmin } from './identityPolicy.ts';

// Shared customer-domain primitives used by customerRead, customerWrite and
// scooterActions. Keep this module free of action/routing logic — it holds only
// role checks, field normalization and the audit helper.

export const STAFF_ROLES = new Set(['admin']);
export const MANAGER_ROLES = new Set(['admin']);
export const CUSTOMER_STATUSES = ['active', 'pending', 'in_review', 'onboarding', 'needs_follow_up', 'inactive', 'suspended', 'closed'];

export function isStaff(user) {
  return isAdmin(user);
}

export function isManager(user) {
  return isAdmin(user);
}

export function userField(user, key) {
  return user?.[key] ?? user?.data?.[key] ?? '';
}

export function isCustomerUserRecord(user) {
  return !!user?.id && !user?.is_service && authenticatedRole(user) === 'customer';
}

export function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function cleanPhone(value) {
  return String(value || '').trim();
}

export function cleanText(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, '')}`;
  return /^\+614\d{8}$/.test(phone) ? phone : '';
}

export function customerName(customer) {
  return customer?.full_name || customer?.name || customer?.display_name || 'Customer';
}

export function addIdList(existing, nextId) {
  const ids = String(existing || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (nextId && !ids.includes(nextId)) ids.push(nextId);
  return ids.join(',');
}

export function scooterMatches(a, b) {
  const aSerial = cleanText(a.serial_number);
  const bSerial = cleanText(b.serial_number);
  if (aSerial && bSerial && aSerial === bSerial) return true;
  return !!cleanText(a.model) && cleanText(a.make) === cleanText(b.make) && cleanText(a.model) === cleanText(b.model);
}

export async function logCustomerAudit(entities, actor, customer, summary, metadata = {}) {
  await entities.AuditEvent.create({
    event_type: 'customer_update',
    customer_id: customer.id,
    actor_id: actor?.id || null,
    actor_name: actor?.full_name || actor?.email || 'Staff',
    actor_role: actor?.role || '',
    summary,
    visibility: 'internal',
    metadata: { customer_id: customer.id, customer_account_id: customer.id, stable_customer_id: customer.customer_id || customer.id, ...metadata },
  }).catch(() => null);
}

// Authenticates the caller and returns a service-role entity client.
// On failure `error` holds the Response the function should return as-is.
export async function resolveStaffContext(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isStaff(user)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user, entities: base44.asServiceRole.entities };
}
