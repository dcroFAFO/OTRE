import { requireAdminContext, sha256 } from '../../shared/identityAuth.ts';

const PAGE_SIZE = 250;
const MAX_PAGES = 100_000;
const LOCK_KEY = 'identity-migration:v2:active';
const LOCK_TTL_MS = 10 * 60 * 1000;
const CANONICAL_ROLES = new Set(['admin', 'customer']);

const OWNERSHIP_SPECS = [
  { entity: 'Attachment', canonical: 'customer_account_id', stable: ['customer_id'], jobs: ['job_id'] },
  { entity: 'AuditEvent', canonical: 'customer_account_id', stable: ['customer_id'], jobs: ['job_id'] },
  { entity: 'BookingClaim', canonical: 'customer_account_id', users: ['user_id'], jobs: ['job_id'] },
  { entity: 'CustomerProfile', canonical: 'customer_account_id', users: ['auth_user_id'] },
  { entity: 'CustomerReward', canonical: 'customer_account_id', stable: ['customer_id'], users: ['auth_user_id'] },
  { entity: 'FeedbackInvitation', canonical: 'customer_account_id', jobs: ['job_id'], invoices: ['invoice_id'] },
  { entity: 'NotificationEvent', canonical: 'customer_account_id', stable: ['customer_id'], jobs: ['job_id'] },
  { entity: 'PaymentEvent', canonical: 'customer_account_id', jobs: ['job_id'], invoices: ['invoice_id'] },
  { entity: 'Scooter', canonical: 'customer_account_id', stable: ['customer_id'] },
  { entity: 'SocialConnection', canonical: 'customer_account_id', stable: ['customer_id'], users: ['auth_user_id'] },
  { entity: 'CustomerNote', stable: ['customer_id'], jobs: ['job_id'] },
  { entity: 'Feedback', stable: ['customer_id'], jobs: ['job_id'] },
  { entity: 'InventoryUsage', stable: ['customer_id'], jobs: ['job_id'] },
  { entity: 'JobNote', stable: ['customer_id'], jobs: ['job_id'] },
  { entity: 'Order', stable: ['customer_id'], jobs: ['job_id'] },
  { entity: 'Quote', stable: ['customer_id'], jobs: ['job_id'] },
];

const USER_REFERENCE_SPECS = [
  { entity: 'BlogCategory', fields: ['user_id'] },
  { entity: 'BlogComment', fields: ['author_user_id'] },
  { entity: 'BlogLog', fields: ['user_id'] },
  { entity: 'BlogPost', fields: ['user_id'] },
  { entity: 'BlogSettings', fields: ['user_id'] },
  { entity: 'BlogTag', fields: ['user_id'] },
  { entity: 'NotificationDelivery', fields: ['recipient_user_id'] },
  { entity: 'NotificationPreference', fields: ['user_id'] },
  { entity: 'PhoneVerification', fields: ['consumed_by_user_id'] },
  { entity: 'PhoneVerificationUse', fields: ['user_id'] },
  { entity: 'StaffProfile', fields: ['user_id'] },
];

class MigrationHttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'MigrationHttpError';
    this.status = status;
    this.code = code;
  }
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function currentValue(record: any, field: string) {
  return record?.[field] === undefined ? null : record[field];
}

function stableValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableJson(value: any): string {
  return JSON.stringify(stableValue(value));
}

function sameValue(left: any, right: any): boolean {
  return stableJson(left) === stableJson(right);
}

function groupBy(records: any[], key: string) {
  const groups = new Map<string, any[]>();
  for (const record of records) {
    const value = text(record?.[key]);
    if (!value) continue;
    groups.set(value, [...(groups.get(value) || []), record]);
  }
  return groups;
}

async function listAll(entities: any, entityName: string, sort = 'created_date') {
  const output: any[] = [];
  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
    const page = await entities[entityName].list(sort, PAGE_SIZE, pageIndex * PAGE_SIZE);
    if (!Array.isArray(page)) throw new Error(`${entityName} inventory did not return an array.`);
    output.push(...page);
    if (page.length < PAGE_SIZE) return output;
  }
  throw new Error(`${entityName} inventory exceeded the bounded pagination guard.`);
}

async function filterAll(entities: any, entityName: string, query: any, sort = 'created_date') {
  const output: any[] = [];
  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
    const page = await entities[entityName].filter(query, sort, PAGE_SIZE, pageIndex * PAGE_SIZE);
    if (!Array.isArray(page)) throw new Error(`${entityName} filtered inventory did not return an array.`);
    output.push(...page);
    if (page.length < PAGE_SIZE) return output;
  }
  throw new Error(`${entityName} filtered inventory exceeded the bounded pagination guard.`);
}

function issue(severity: 'blocking' | 'warning', issueType: string, entityName: string, entityId: string, relatedIds: unknown[], message: string) {
  return {
    severity,
    issue_type: issueType,
    entity_name: entityName,
    entity_id: text(entityId),
    related_ids: relatedIds.map(text).filter(Boolean),
    message,
  };
}

function normalizeDispositions(payload: any) {
  const roleEntries = Array.isArray(payload?.role_dispositions) ? payload.role_dispositions : [];
  const accountEntries = Array.isArray(payload?.account_dispositions) ? payload.account_dispositions : [];
  const errors: any[] = [];
  const roles = new Map<string, any>();
  const accounts: any[] = [];

  for (const raw of roleEntries) {
    const userId = text(raw?.user_id);
    const targetRole = text(raw?.target_role).toLowerCase();
    const reason = text(raw?.reason);
    if (!userId || !CANONICAL_ROLES.has(targetRole) || reason.length < 8) {
      errors.push(issue('blocking', 'invalid_role_disposition', 'User', userId, [], 'Each role disposition requires user_id, a canonical target_role, and an approval reason of at least 8 characters.'));
      continue;
    }
    if (roles.has(userId)) {
      errors.push(issue('blocking', 'duplicate_role_disposition', 'User', userId, [], `User ${userId} has more than one role disposition.`));
      continue;
    }
    roles.set(userId, { user_id: userId, target_role: targetRole, reason });
  }

  const accountKeys = new Set<string>();
  for (const raw of accountEntries) {
    const userId = text(raw?.user_id);
    const customerId = text(raw?.customer_account_id);
    const action = text(raw?.action).toLowerCase();
    const reason = text(raw?.reason);
    const key = `${userId}:${customerId}:${action}`;
    if (!userId || !customerId || !['link', 'unlink'].includes(action) || reason.length < 8) {
      errors.push(issue('blocking', 'invalid_account_disposition', 'Customer', customerId, [userId], 'Each account disposition requires user_id, customer_account_id, link or unlink action, and an approval reason of at least 8 characters.'));
      continue;
    }
    if (accountKeys.has(key)) {
      errors.push(issue('blocking', 'duplicate_account_disposition', 'Customer', customerId, [userId], 'The same account disposition was supplied more than once.'));
      continue;
    }
    accountKeys.add(key);
    accounts.push({ user_id: userId, customer_account_id: customerId, action, reason });
  }

  return {
    roles,
    accounts,
    errors,
    serializable: {
      role_dispositions: [...roles.values()].sort((a, b) => a.user_id.localeCompare(b.user_id)),
      account_dispositions: accounts.sort((a, b) => `${a.user_id}:${a.customer_account_id}:${a.action}`.localeCompare(`${b.user_id}:${b.customer_account_id}:${b.action}`)),
    },
  };
}

class PlanBuilder {
  updates = new Map<string, any>();
  creates = new Map<string, any>();

  update(entityName: string, record: any, patch: any, sequence: number) {
    const changedPatch = Object.fromEntries(Object.entries(patch).filter(([field, value]) => !sameValue(currentValue(record, field), value)));
    if (!Object.keys(changedPatch).length) return;
    const key = `${entityName}:${record.id}`;
    const existing = this.updates.get(key) || {
      change_key_suffix: key,
      entity_name: entityName,
      entity_id: record.id,
      operation: 'update',
      sequence,
      before: {},
      after: {},
    };
    for (const [field, value] of Object.entries(changedPatch)) {
      if (!(field in existing.before)) existing.before[field] = currentValue(record, field);
      existing.after[field] = value;
    }
    existing.sequence = Math.min(existing.sequence, sequence);
    this.updates.set(key, existing);
  }

  create(entityName: string, suffix: string, after: any, sequence: number) {
    const key = `${entityName}:create:${suffix}`;
    this.creates.set(key, {
      change_key_suffix: key,
      entity_name: entityName,
      entity_id: '',
      operation: 'create',
      sequence,
      before: { absent: true },
      after,
    });
  }

  values() {
    return [...this.updates.values(), ...this.creates.values()].sort((a, b) => a.sequence - b.sequence || a.change_key_suffix.localeCompare(b.change_key_suffix));
  }
}

function resolveOwner(record: any, spec: any, context: any) {
  const candidates = new Map<string, any>();
  const references: string[] = [];
  const remember = (customer: any, reference: unknown) => {
    const value = text(reference);
    if (value) references.push(value);
    if (customer?.id) candidates.set(customer.id, customer);
  };
  if (spec.canonical) remember(context.customerById.get(text(record?.[spec.canonical])), record?.[spec.canonical]);
  for (const field of spec.stable || []) {
    const value = text(record?.[field]);
    for (const customer of context.customersByStable.get(value) || []) remember(customer, value);
  }
  for (const field of spec.users || []) {
    const value = text(record?.[field]);
    for (const customer of context.customersByUser.get(value) || []) remember(customer, value);
  }
  for (const field of spec.jobs || []) remember(context.ownerByJob.get(text(record?.[field])), record?.[field]);
  for (const field of spec.invoices || []) remember(context.ownerByInvoice.get(text(record?.[field])), record?.[field]);
  return { candidates: [...candidates.values()], references: [...new Set(references)] };
}

function mappedMimeType(fileName: unknown): string {
  const extension = text(fileName).toLowerCase().split('.').pop() || '';
  return ({
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
    gif: 'image/gif', heic: 'image/heic', txt: 'text/plain', csv: 'text/csv', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  } as Record<string, string>)[extension] || 'application/octet-stream';
}

function paymentProvider(invoice: any): string | null {
  const current = text(invoice.payment_provider).toLowerCase();
  if (['manual', 'stripe_legacy', 'none'].includes(current)) return current;
  if (current === 'stripe') return 'stripe_legacy';
  if (!current && (invoice.payment_intent_ref || invoice.stripe_checkout_session_id)) return 'stripe_legacy';
  if (!current && invoice.payment_method) return text(invoice.payment_method).toLowerCase() === 'card' ? 'stripe_legacy' : 'manual';
  if (!current) return 'none';
  return null;
}

function paymentMethod(invoice: any): string | null {
  const current = text(invoice.payment_method).toLowerCase();
  if (!current || ['cash', 'eftpos', 'bank_transfer', 'other', 'card_legacy'].includes(current)) return current;
  if (['card', 'stripe', 'credit_card', 'creditcard'].includes(current)) return 'card_legacy';
  return null;
}

function providerMode(config: any): string | null {
  const current = text(config.mode).toLowerCase();
  if (['manual_only', 'disabled', 'legacy_read_only'].includes(current)) return current;
  if (['not_configured', 'off', 'inactive'].includes(current)) return 'disabled';
  if (['manual', 'manual_payment'].includes(current)) return 'manual_only';
  if (['legacy', 'stripe', 'read_only'].includes(current)) return 'legacy_read_only';
  return null;
}

async function buildSnapshot(entities: any, payload: any) {
  const dispositions = normalizeDispositions(payload);
  const entityNames = [...new Set([
    'User', 'Customer', 'CustomerIdentityLink', 'Job', 'Invoice', 'PaymentProviderConfig', 'NotificationEvent',
    ...OWNERSHIP_SPECS.map((entry) => entry.entity),
    ...USER_REFERENCE_SPECS.map((entry) => entry.entity),
  ])];
  const rows: Record<string, any[]> = {};
  await Promise.all(entityNames.map(async (entityName) => {
    rows[entityName] = await listAll(entities, entityName);
  }));

  const issues = [...dispositions.errors];
  const plan = new PlanBuilder();
  const users = rows.User;
  const customers = rows.Customer;
  const links = rows.CustomerIdentityLink;
  const userById = new Map(users.map((user: any) => [user.id, user]));
  const customerById = new Map(customers.map((customer: any) => [customer.id, { ...customer }]));

  const targetRoles = new Map<string, string>();
  for (const user of users) {
    const currentRole = text(user.role).toLowerCase();
    const disposition = dispositions.roles.get(user.id);
    if (CANONICAL_ROLES.has(currentRole)) {
      if (disposition && disposition.target_role !== currentRole) {
        issues.push(issue('blocking', 'canonical_role_reclassification_forbidden', 'User', user.id, [], 'Canonical roles cannot be reclassified by the migration. Change the approved source data before preflight.'));
      }
      targetRoles.set(user.id, currentRole);
      if (Number(user.identity_version || 0) < 2) plan.update('User', user, { identity_version: 2 }, 10);
      continue;
    }
    if (!disposition) {
      issues.push(issue('blocking', 'role_disposition_required', 'User', user.id, [], `Legacy role ${currentRole || '(empty)'} requires an explicit approved target role.`));
      continue;
    }
    targetRoles.set(user.id, disposition.target_role);
    plan.update('User', user, { role: disposition.target_role, identity_version: 2 }, 10);
  }
  for (const disposition of dispositions.roles.values()) {
    if (!userById.has(disposition.user_id)) issues.push(issue('blocking', 'role_disposition_user_missing', 'User', disposition.user_id, [], 'Role disposition references a missing User.'));
  }

  const desiredUserByCustomer = new Map(customers.map((customer: any) => [customer.id, text(customer.user_id)]));
  const approvedAccountUsers = new Set<string>();
  const approvedAccountCustomers = new Set<string>();
  for (const disposition of dispositions.accounts) {
    const user = userById.get(disposition.user_id);
    const customer = customerById.get(disposition.customer_account_id);
    approvedAccountUsers.add(disposition.user_id);
    approvedAccountCustomers.add(disposition.customer_account_id);
    if (!user) {
      issues.push(issue('blocking', 'account_disposition_user_missing', 'User', disposition.user_id, [disposition.customer_account_id], 'Account disposition references a missing User.'));
      continue;
    }
    if (!customer) {
      issues.push(issue('blocking', 'account_disposition_customer_missing', 'Customer', disposition.customer_account_id, [disposition.user_id], 'Account disposition references a missing Customer.'));
      continue;
    }
    if (disposition.action === 'link') {
      if (targetRoles.get(user.id) !== 'customer') {
        issues.push(issue('blocking', 'noncustomer_account_link', 'Customer', customer.id, [user.id], 'Only a post-normalization customer User may own a Customer account.'));
        continue;
      }
      desiredUserByCustomer.set(customer.id, user.id);
    } else if (desiredUserByCustomer.get(customer.id) !== user.id) {
      issues.push(issue('blocking', 'unlink_disposition_mismatch', 'Customer', customer.id, [user.id], 'Unlink disposition does not match the Customer current user_id.'));
    } else {
      desiredUserByCustomer.set(customer.id, '');
    }
  }

  const desiredCustomersByUser = new Map<string, any[]>();
  for (const customer of customers) {
    const desiredUserId = desiredUserByCustomer.get(customer.id) || '';
    if (!desiredUserId) continue;
    const desiredUser = userById.get(desiredUserId);
    if (!desiredUser) {
      issues.push(issue('blocking', 'orphan_customer_user_id', 'Customer', customer.id, [desiredUserId], `Customer ${customer.id} references a missing User.`));
      continue;
    }
    if (targetRoles.get(desiredUserId) !== 'customer') {
      issues.push(issue('blocking', 'customer_linked_to_noncustomer', 'Customer', customer.id, [desiredUserId], 'Customer is linked to a User whose approved post-normalization role is not customer.'));
      continue;
    }
    desiredCustomersByUser.set(desiredUserId, [...(desiredCustomersByUser.get(desiredUserId) || []), customer]);
  }
  for (const user of users) {
    const targetRole = targetRoles.get(user.id);
    const owned = desiredCustomersByUser.get(user.id) || [];
    if (targetRole === 'customer' && owned.length !== 1) {
      issues.push(issue('blocking', owned.length ? 'duplicate_customer_user_id' : 'customer_account_disposition_required', 'User', user.id, owned.map((customer) => customer.id), `Post-normalization customer User ${user.id} must own exactly one Customer account; found ${owned.length}.`));
    }
    if (targetRole === 'admin' && owned.length) {
      issues.push(issue('blocking', 'admin_customer_link_requires_unlink', 'User', user.id, owned.map((customer) => customer.id), 'Post-normalization admin Users cannot own Customer accounts; provide explicit unlink dispositions.'));
    }
  }

  const now = new Date().toISOString();
  for (const customer of customers) {
    const desiredUserId = desiredUserByCustomer.get(customer.id) || '';
    const patch: any = { user_id: desiredUserId, identity_version: 2 };
    if (desiredUserId) {
      patch.identity_linked_at = customer.identity_linked_at || now;
      patch.identity_link_source = customer.identity_link_source || 'admin_migration';
    }
    plan.update('Customer', customer, patch, 20);
    customerById.set(customer.id, { ...customer, ...patch });
  }

  const desiredCustomers = [...customerById.values()];
  const customersByUser = groupBy(desiredCustomers, 'user_id');
  const customersByStable = groupBy(desiredCustomers, 'customer_id');
  for (const [stableId, matches] of customersByStable) {
    if (matches.length > 1) issues.push(issue('blocking', 'duplicate_customer_stable_id', 'Customer', matches[0].id, matches.map((customer) => customer.id), `Customer stable identifier ${stableId} is not unique.`));
  }

  const activeLinks = links.filter((link: any) => link.status === 'active');
  for (const link of links.filter((entry: any) => entry.status === 'pending')) {
    issues.push(issue('blocking', 'pending_identity_bootstrap', 'CustomerIdentityLink', link.id, [link.user_id, link.customer_account_id], 'Pending identity bootstrap requires reconciliation before migration.'));
  }
  for (const link of activeLinks) {
    const customer = customerById.get(text(link.customer_account_id));
    const desiredUser = customer ? text(customer.user_id) : '';
    const exact = !!customer && desiredUser === text(link.user_id);
    if (exact) continue;
    if (!approvedAccountUsers.has(text(link.user_id)) && !approvedAccountCustomers.has(text(link.customer_account_id))) {
      issues.push(issue('blocking', 'identity_link_disposition_required', 'CustomerIdentityLink', link.id, [link.user_id, link.customer_account_id], 'Conflicting active identity link requires an explicit approved account disposition.'));
      continue;
    }
    plan.update('CustomerIdentityLink', link, { status: 'revoked', revoked_at: now, revoked_reason: 'admin_migration_disposition' }, 30);
  }
  for (const customer of desiredCustomers.filter((entry: any) => entry.user_id)) {
    const exact = activeLinks.filter((link: any) => link.user_id === customer.user_id && link.customer_account_id === customer.id);
    if (exact.length > 1) {
      if (!approvedAccountUsers.has(customer.user_id) && !approvedAccountCustomers.has(customer.id)) {
        issues.push(issue('blocking', 'duplicate_active_identity_link', 'CustomerIdentityLink', exact[0].id, exact.map((link: any) => link.id), 'Duplicate active identity links require an explicit account disposition.'));
      } else {
        for (const duplicate of exact.slice(1)) plan.update('CustomerIdentityLink', duplicate, { status: 'revoked', revoked_at: now, revoked_reason: 'duplicate_admin_migration_link' }, 30);
      }
    }
    if (!exact.length) {
      plan.create('CustomerIdentityLink', `${customer.user_id}:${customer.id}`, { user_id: customer.user_id, customer_account_id: customer.id, status: 'active', source: 'admin_migration', linked_at: now }, 40);
    }
  }

  const ownerByJob = new Map<string, any>();
  for (const job of rows.Job) {
    const resolution = resolveOwner(job, { canonical: 'customer_account_id', stable: ['customer_id', 'customerId'], users: ['customer_user_id'] }, { customerById, customersByStable, customersByUser, ownerByJob: new Map(), ownerByInvoice: new Map() });
    if (resolution.candidates.length > 1) {
      issues.push(issue('blocking', 'conflicting_job_owner', 'Job', job.id, resolution.candidates.map((customer) => customer.id), `Job ${job.id} contains conflicting explicit customer identifiers.`));
      continue;
    }
    if (!resolution.candidates.length) {
      if (resolution.references.length) issues.push(issue('blocking', 'unresolved_job_owner', 'Job', job.id, resolution.references, `Job ${job.id} has ownership identifiers but no unambiguous Customer match. Contact data was deliberately not used.`));
      if (text(job.status).toLowerCase() === 'completed' && !job.completed_at) issues.push(issue('warning', 'missing_completion_timestamp', 'Job', job.id, [], `Completed job ${job.id} has no completed_at; public tracking remains fail closed.`));
      continue;
    }
    const customer = resolution.candidates[0];
    ownerByJob.set(job.id, customer);
    plan.update('Job', job, { customer_account_id: customer.id, customer_user_id: customer.user_id || '', claimed_by_customer: !!customer.user_id, claim_status: customer.user_id ? 'claimed' : 'unclaimed' }, 100);
    if (text(job.status).toLowerCase() === 'completed' && !job.completed_at) issues.push(issue('warning', 'missing_completion_timestamp', 'Job', job.id, [customer.id], `Completed job ${job.id} has no completed_at; public tracking remains fail closed.`));
  }

  const ownerByInvoice = new Map<string, any>();
  for (const invoice of rows.Invoice) {
    const resolution = resolveOwner(invoice, { canonical: 'customer_account_id', stable: ['customer_id'], jobs: ['job_id'] }, { customerById, customersByStable, customersByUser, ownerByJob, ownerByInvoice: new Map() });
    if (resolution.candidates.length > 1) issues.push(issue('blocking', 'conflicting_invoice_owner', 'Invoice', invoice.id, resolution.candidates.map((customer) => customer.id), 'Invoice contains conflicting customer identifiers.'));
    else if (!resolution.candidates.length && resolution.references.length) issues.push(issue('blocking', 'unresolved_invoice_owner', 'Invoice', invoice.id, resolution.references, 'Invoice ownership could not be resolved without contact-data matching.'));
    else if (resolution.candidates.length === 1) {
      const customer = resolution.candidates[0];
      ownerByInvoice.set(invoice.id, customer);
      plan.update('Invoice', invoice, { customer_account_id: customer.id, customer_id: invoice.customer_id || customer.customer_id || '' }, 200);
    }
    const provider = paymentProvider(invoice);
    const method = paymentMethod(invoice);
    if (provider === null) issues.push(issue('blocking', 'unsupported_invoice_payment_provider', 'Invoice', invoice.id, [invoice.payment_provider], 'Invoice payment_provider requires an explicit compatibility decision.'));
    else plan.update('Invoice', invoice, { payment_provider: provider }, 210);
    if (method === null) issues.push(issue('blocking', 'unsupported_invoice_payment_method', 'Invoice', invoice.id, [invoice.payment_method], 'Invoice payment_method requires an explicit compatibility decision.'));
    else if (method) plan.update('Invoice', invoice, { payment_method: method }, 210);
    if (text(invoice.status).toLowerCase() === 'outstanding') plan.update('Invoice', invoice, { status: 'issued' }, 210);
  }

  for (const config of rows.PaymentProviderConfig) {
    const mode = providerMode(config);
    if (mode === null) {
      issues.push(issue('blocking', 'unsupported_payment_provider_mode', 'PaymentProviderConfig', config.id, [config.mode], 'Payment provider mode requires an explicit compatibility decision.'));
      continue;
    }
    const providerKey = text(config.provider_key).toLowerCase();
    plan.update('PaymentProviderConfig', config, { mode, active: providerKey === 'manual' ? mode === 'manual_only' : false }, 220);
  }

  const ownerContext = { customerById, customersByStable, customersByUser, ownerByJob, ownerByInvoice };
  for (const spec of OWNERSHIP_SPECS) {
    if (['Attachment', 'NotificationEvent'].includes(spec.entity)) continue;
    for (const record of rows[spec.entity]) {
      const resolution = resolveOwner(record, spec, ownerContext);
      if (resolution.candidates.length > 1) issues.push(issue('blocking', 'conflicting_dependent_owner', spec.entity, record.id, resolution.candidates.map((customer) => customer.id), `${spec.entity} has conflicting ownership references.`));
      else if (!resolution.candidates.length && resolution.references.length) issues.push(issue('blocking', 'unresolved_dependent_owner', spec.entity, record.id, resolution.references, `${spec.entity} ownership could not be resolved without contact-data matching.`));
      else if (resolution.candidates.length === 1 && spec.canonical) {
        const customer = resolution.candidates[0];
        const patch: any = { [spec.canonical]: customer.id };
        const stableField = spec.stable?.[0];
        if (stableField && !record[stableField] && customer.customer_id) patch[stableField] = customer.customer_id;
        const userField = spec.users?.[0];
        if (userField) patch[userField] = customer.user_id || '';
        plan.update(spec.entity, record, patch, 300);
      }
    }
  }

  for (const record of rows.Attachment) {
    const resolution = resolveOwner(record, OWNERSHIP_SPECS[0], ownerContext);
    if (resolution.candidates.length > 1) issues.push(issue('blocking', 'conflicting_dependent_owner', 'Attachment', record.id, resolution.candidates.map((customer) => customer.id), 'Attachment has conflicting ownership references.'));
    else if (!resolution.candidates.length && resolution.references.length) issues.push(issue('blocking', 'unresolved_dependent_owner', 'Attachment', record.id, resolution.references, 'Attachment ownership could not be resolved without contact-data matching.'));
    const patch: any = {};
    if (resolution.candidates.length === 1) {
      const customer = resolution.candidates[0];
      patch.customer_account_id = customer.id;
      if (!record.customer_id && customer.customer_id) patch.customer_id = customer.customer_id;
    }
    const missingRequired = !text(record.file_name) || !text(record.mime_type) || !Number.isFinite(Number(record.file_size)) || Number(record.file_size) < 0 || !text(record.kind);
    const publicLegacy = !text(record.file_uri) && !!text(record.file_url);
    if (!text(record.job_id)) issues.push(issue('blocking', 'attachment_job_missing', 'Attachment', record.id, [], 'Attachment has no job_id and cannot be safely assigned.'));
    if (missingRequired) {
      patch.file_name = text(record.file_name) || `legacy-attachment-${record.id}`;
      patch.mime_type = text(record.mime_type) || mappedMimeType(record.file_name);
      patch.file_size = Number.isFinite(Number(record.file_size)) && Number(record.file_size) >= 0 ? Number(record.file_size) : 0;
      patch.kind = text(record.kind) || (String(patch.mime_type || record.mime_type).startsWith('image/') ? 'photo' : 'document');
    }
    if (missingRequired || publicLegacy) {
      patch.storage = publicLegacy ? 'public_legacy' : (record.storage || 'private');
      patch.visibility = 'internal';
      patch.archived_at = record.archived_at || now;
      patch.archive_reason = record.archive_reason || (publicLegacy ? 'migration_quarantine: public legacy object requires private re-upload' : 'migration_quarantine: legacy attachment metadata was incomplete');
      issues.push(issue('warning', 'attachment_quarantined', 'Attachment', record.id, [], 'Legacy attachment will be retained but archived and hidden until staff verify metadata and private object ownership.'));
    }
    plan.update('Attachment', record, patch, 320);
  }

  const notificationGroups = groupBy(rows.NotificationEvent, 'event_key');
  const existingEventKeys = new Set(rows.NotificationEvent.map((event: any) => text(event.event_key)).filter(Boolean));
  for (const event of rows.NotificationEvent.filter((entry: any) => !text(entry.event_key))) {
    const generated = `legacy:${await sha256(`NotificationEvent:${event.id}`)}`;
    plan.update('NotificationEvent', event, { event_key: generated }, 400);
    existingEventKeys.add(generated);
  }
  for (const [eventKey, events] of notificationGroups) {
    if (events.length < 2) continue;
    const ordered = [...events].sort((left, right) => `${left.created_date || ''}:${left.id}`.localeCompare(`${right.created_date || ''}:${right.id}`));
    for (const duplicate of ordered.slice(1)) {
      let generated = `legacy:${(await sha256(`${eventKey}:${duplicate.id}`)).slice(0, 24)}:${eventKey.slice(0, 160)}`;
      if (existingEventKeys.has(generated)) generated = `legacy:${await sha256(`${eventKey}:${duplicate.id}:collision`)}`;
      existingEventKeys.add(generated);
      plan.update('NotificationEvent', duplicate, { event_key: generated }, 400);
    }
  }
  for (const event of rows.NotificationEvent) {
    const resolution = resolveOwner(event, OWNERSHIP_SPECS.find((entry) => entry.entity === 'NotificationEvent'), ownerContext);
    if (resolution.candidates.length > 1) issues.push(issue('blocking', 'conflicting_dependent_owner', 'NotificationEvent', event.id, resolution.candidates.map((customer) => customer.id), 'NotificationEvent has conflicting ownership references.'));
    else if (!resolution.candidates.length && resolution.references.length) issues.push(issue('blocking', 'unresolved_dependent_owner', 'NotificationEvent', event.id, resolution.references, 'NotificationEvent ownership could not be resolved.'));
    else if (resolution.candidates.length === 1) {
      const customer = resolution.candidates[0];
      plan.update('NotificationEvent', event, { customer_account_id: customer.id, customer_id: event.customer_id || customer.customer_id || '' }, 410);
    }
  }

  const userIds = new Set(users.map((user: any) => user.id));
  for (const spec of USER_REFERENCE_SPECS) {
    for (const record of rows[spec.entity]) {
      for (const field of spec.fields) {
        const userId = text(record[field]);
        if (userId && !userIds.has(userId)) issues.push(issue('blocking', 'orphan_user_reference', spec.entity, record.id, [userId], `${spec.entity}.${field} references a missing User.`));
      }
    }
  }

  for (const reward of rows.CustomerReward) {
    const sourceId = text(reward.source_customer_account_id);
    if (sourceId && !customerById.has(sourceId)) issues.push(issue('blocking', 'orphan_source_customer', 'CustomerReward', reward.id, [sourceId], 'CustomerReward source_customer_account_id references a missing Customer.'));
  }

  const changes = plan.values();
  const dispositionHash = await sha256(stableJson(dispositions.serializable));
  const fingerprint = entityNames.sort().map((entityName) => [entityName, rows[entityName].map((record: any) => record.id).sort()]);
  const preflightHash = await sha256(stableJson({ dispositionHash, fingerprint, changes, issues }));
  const counts = Object.fromEntries(entityNames.map((entityName) => [entityName, rows[entityName].length]));
  return { rows, issues, changes, counts, dispositionHash, preflightHash, dispositions: dispositions.serializable };
}

async function bulkCreate(entities: any, entityName: string, records: any[]) {
  for (let index = 0; index < records.length; index += 500) {
    await entities[entityName].bulkCreate(records.slice(index, index + 500));
  }
}

async function createRun(entities: any, user: any, mode: string, status: string, snapshot: any, sourcePreflightRunId = '') {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const run = await entities.IdentityMigrationRun.create({
    run_id: runId,
    mode,
    status,
    phase: mode === 'dry_run' ? 'inventory' : 'journal',
    source_preflight_run_id: sourcePreflightRunId,
    started_by_user_id: user.id,
    started_at: startedAt,
    preflight_hash: snapshot.preflightHash,
    disposition_hash: snapshot.dispositionHash,
    counts: { ...snapshot.counts, planned_changes: snapshot.changes.length, issues: snapshot.issues.length },
    expected_change_count: snapshot.changes.length,
    applied_change_count: 0,
    reverted_change_count: 0,
  });
  if (snapshot.issues.length) {
    await bulkCreate(entities, 'IdentityMigrationIssue', snapshot.issues.map((entry: any, index: number) => ({
      ...entry,
      issue_key: `${runId}:${index}:${entry.issue_type}:${entry.entity_id || 'global'}`,
      run_id: runId,
    })));
  }
  return run;
}

async function findRun(entities: any, runId: string) {
  const runs = await entities.IdentityMigrationRun.filter({ run_id: runId }, '-started_at', 2);
  if (runs.length !== 1) throw new MigrationHttpError(404, 'RUN_NOT_FOUND', 'Identity migration run was not found.');
  return runs[0];
}

async function acquireLock(entities: any, user: any, runId: string) {
  const now = Date.now();
  const existing = await entities.IdentityOperation.filter({ operation_key: LOCK_KEY }, '-started_at', 2).catch(() => []);
  if (existing.length > 1) throw new MigrationHttpError(409, 'LOCK_CORRUPT', 'More than one active migration lock exists.');
  if (existing[0]) {
    const expiresAt = new Date(existing[0].expires_at || 0).getTime();
    if (expiresAt > now) throw new MigrationHttpError(409, 'MIGRATION_LOCKED', `Identity migration is already running under run ${existing[0].run_id || 'unknown'}.`);
    await entities.IdentityOperation.delete(existing[0].id);
  }
  const leaseId = crypto.randomUUID();
  const startedAt = new Date(now).toISOString();
  try {
    const lock = await entities.IdentityOperation.create({
      operation_key: LOCK_KEY,
      operation_type: 'admin_migration',
      actor_user_id: user.id,
      status: 'started',
      subject_type: 'IdentityMigrationRun',
      subject_id: runId,
      run_id: runId,
      lease_id: leaseId,
      started_at: startedAt,
      heartbeat_at: startedAt,
      expires_at: new Date(now + LOCK_TTL_MS).toISOString(),
    });
    return { ...lock, lease_id: leaseId };
  } catch (_error) {
    throw new MigrationHttpError(409, 'MIGRATION_LOCKED', 'Another migration operator acquired the durable lock.');
  }
}

async function heartbeat(entities: any, lock: any) {
  const current = await entities.IdentityOperation.get(lock.id).catch(() => null);
  if (!current || current.lease_id !== lock.lease_id || current.operation_key !== LOCK_KEY) throw new MigrationHttpError(409, 'LEASE_LOST', 'Migration lease was lost; no further records were changed.');
  const now = new Date().toISOString();
  await entities.IdentityOperation.update(lock.id, { heartbeat_at: now, expires_at: new Date(Date.now() + LOCK_TTL_MS).toISOString() });
}

async function releaseLock(entities: any, lock: any) {
  const current = await entities.IdentityOperation.get(lock.id).catch(() => null);
  if (current?.lease_id === lock.lease_id) await entities.IdentityOperation.delete(lock.id).catch(() => null);
}

async function ensureJournal(entities: any, run: any, changes: any[]) {
  const existing = await filterAll(entities, 'IdentityMigrationChange', { run_id: run.run_id }, 'sequence');
  const existingKeys = new Set(existing.map((change: any) => change.change_key));
  const missing = changes.filter((change) => !existingKeys.has(`${run.run_id}:${change.change_key_suffix}`)).map((change) => ({
    change_key: `${run.run_id}:${change.change_key_suffix}`,
    run_id: run.run_id,
    entity_name: change.entity_name,
    entity_id: change.entity_id,
    operation: change.operation,
    sequence: change.sequence,
    status: 'planned',
    before: change.before,
    after: change.after,
  }));
  if (missing.length) await bulkCreate(entities, 'IdentityMigrationChange', missing);
  const journal = await filterAll(entities, 'IdentityMigrationChange', { run_id: run.run_id }, 'sequence');
  if (journal.length !== changes.length) throw new Error(`Migration journal expected ${changes.length} changes but contains ${journal.length}.`);
  return journal;
}

function matchesPatch(record: any, patch: any) {
  return Object.entries(patch || {}).every(([field, value]) => sameValue(currentValue(record, field), value));
}

async function applyJournalChange(entities: any, change: any) {
  if (change.status === 'applied') return false;
  if (change.operation === 'create' && change.entity_name === 'CustomerIdentityLink') {
    const existing = await entities.CustomerIdentityLink.filter({ user_id: change.after.user_id }, '-linked_at', 10).catch(() => []);
    const exact = existing.find((link: any) => link.status === 'active' && link.customer_account_id === change.after.customer_account_id);
    const created = exact || await entities.CustomerIdentityLink.create({ ...change.after, migration_run_id: change.run_id });
    await entities.IdentityMigrationChange.update(change.id, { entity_id: created.id, status: 'applied', applied_at: new Date().toISOString() });
    return true;
  }
  const record = await entities[change.entity_name].get(change.entity_id).catch(() => null);
  if (!record) throw new Error(`${change.entity_name} ${change.entity_id} disappeared after preflight.`);
  if (!matchesPatch(record, change.after)) {
    if (!matchesPatch(record, change.before)) throw new Error(`${change.entity_name} ${change.entity_id} changed outside the migration; refusing to overwrite it.`);
    await entities[change.entity_name].update(change.entity_id, change.after);
  }
  await entities.IdentityMigrationChange.update(change.id, { status: 'applied', applied_at: new Date().toISOString(), failure_message: '' });
  return true;
}

async function executeApply(entities: any, user: any, run: any, lock: any, journal: any[]) {
  let applied = Number(run.applied_change_count || 0);
  await entities.IdentityMigrationRun.update(run.id, { status: 'applying', phase: 'apply', lease_id: lock.lease_id, last_heartbeat_at: new Date().toISOString() });
  try {
    for (let index = 0; index < journal.length; index += 1) {
      if (index % 25 === 0) {
        await heartbeat(entities, lock);
        await entities.IdentityMigrationRun.update(run.id, { last_heartbeat_at: new Date().toISOString(), cursor: String(index), applied_change_count: applied });
      }
      if (await applyJournalChange(entities, journal[index])) applied += 1;
    }
    await entities.IdentityMigrationRun.update(run.id, { status: 'completed', phase: 'verify', cursor: String(journal.length), applied_change_count: journal.length, completed_at: new Date().toISOString(), failure_message: '' });
    return { applied: true, replay: false, run_id: run.run_id, applied_changes: journal.length };
  } catch (error) {
    await entities.IdentityMigrationRun.update(run.id, { status: 'failed', applied_change_count: applied, failure_message: text(error?.message || error).slice(0, 1000), completed_at: new Date().toISOString() }).catch(() => null);
    throw error;
  } finally {
    await releaseLock(entities, lock);
  }
}

async function applyMigration(entities: any, user: any, payload: any) {
  if (payload.confirm !== 'APPLY_IDENTITY_V2') throw new MigrationHttpError(400, 'CONFIRMATION_REQUIRED', 'Explicit apply confirmation is required.');
  const preflightRunId = text(payload.preflight_run_id);
  if (!preflightRunId) throw new MigrationHttpError(400, 'PREFLIGHT_RUN_REQUIRED', 'preflight_run_id is required.');
  const preflight = await findRun(entities, preflightRunId);
  if (preflight.mode !== 'dry_run' || preflight.status !== 'completed') throw new MigrationHttpError(409, 'PREFLIGHT_NOT_APPROVED', 'Apply requires a completed, blocker-free dry run.');
  if (preflight.started_by_user_id !== user.id) throw new MigrationHttpError(403, 'PREFLIGHT_ACTOR_MISMATCH', 'The administrator who approved preflight must perform apply.');
  const dispositions = normalizeDispositions(payload);
  const dispositionHash = await sha256(stableJson(dispositions.serializable));
  if (dispositionHash !== preflight.disposition_hash) throw new MigrationHttpError(409, 'DISPOSITION_STALE', 'Approved role/account dispositions differ from preflight.');

  const existingRuns = await entities.IdentityMigrationRun.filter({ source_preflight_run_id: preflightRunId }, '-started_at', 10).catch(() => []);
  if (existingRuns.length > 1) throw new MigrationHttpError(409, 'APPLY_RUN_CONFLICT', 'More than one apply run is bound to this preflight.');
  let run = existingRuns[0] || null;
  if (run?.status === 'completed') return { applied: true, replay: true, run_id: run.run_id, applied_changes: Number(run.applied_change_count || 0) };

  let snapshot: any = null;
  if (!run || run.phase === 'journal') {
    snapshot = await buildSnapshot(entities, payload);
    if (snapshot.preflightHash !== preflight.preflight_hash) throw new MigrationHttpError(409, 'PREFLIGHT_STALE', 'Migration-relevant data changed after preflight. Run dry_run again.');
    if (snapshot.issues.some((entry: any) => entry.severity === 'blocking')) throw new MigrationHttpError(409, 'PREFLIGHT_BLOCKED', 'Blocking identity/data conflicts remain.');
  }
  if (!run) run = await createRun(entities, user, 'apply', 'preparing', snapshot, preflightRunId);
  else if (payload.resume_run_id !== run.run_id) throw new MigrationHttpError(409, 'RESUME_CONFIRMATION_REQUIRED', `Retry with resume_run_id ${run.run_id}.`);

  const lock = await acquireLock(entities, user, run.run_id);
  try {
    let journal;
    if (run.phase === 'journal' || run.status === 'preparing') {
      journal = await ensureJournal(entities, run, snapshot.changes);
      await entities.IdentityMigrationRun.update(run.id, { status: 'applying', phase: 'apply', journal_change_count: journal.length, lease_id: lock.lease_id });
    } else {
      journal = await filterAll(entities, 'IdentityMigrationChange', { run_id: run.run_id }, 'sequence');
      if (journal.length !== Number(run.expected_change_count || 0)) throw new Error('Existing apply run has an incomplete journal and cannot resume after mutations started.');
    }
    return await executeApply(entities, user, { ...run, status: 'applying', phase: 'apply' }, lock, journal);
  } catch (error) {
    await releaseLock(entities, lock);
    throw error;
  }
}

async function rollbackChange(entities: any, change: any) {
  if (change.status === 'reverted' || change.status === 'planned') return false;
  if (change.operation === 'create') {
    const record = change.entity_id ? await entities[change.entity_name].get(change.entity_id).catch(() => null) : null;
    if (record) {
      if (!matchesPatch(record, change.after)) throw new Error(`${change.entity_name} ${change.entity_id} changed after migration; refusing rollback deletion.`);
      await entities[change.entity_name].delete(change.entity_id);
    }
  } else {
    const record = await entities[change.entity_name].get(change.entity_id).catch(() => null);
    if (!record) throw new Error(`${change.entity_name} ${change.entity_id} is missing during rollback.`);
    if (!matchesPatch(record, change.before)) {
      if (!matchesPatch(record, change.after)) throw new Error(`${change.entity_name} ${change.entity_id} changed after migration; refusing rollback overwrite.`);
      await entities[change.entity_name].update(change.entity_id, change.before);
    }
  }
  await entities.IdentityMigrationChange.update(change.id, { status: 'reverted', reverted_at: new Date().toISOString(), failure_message: '' });
  return true;
}

async function rollbackMigration(entities: any, user: any, payload: any) {
  const runId = text(payload.run_id);
  if (!runId) throw new MigrationHttpError(400, 'RUN_REQUIRED', 'run_id is required.');
  if (payload.confirm !== `ROLLBACK_IDENTITY_V2:${runId}`) throw new MigrationHttpError(400, 'CONFIRMATION_REQUIRED', 'Explicit rollback confirmation is required.');
  const run = await findRun(entities, runId);
  if (run.mode !== 'apply' || !['completed', 'failed', 'rolling_back', 'rollback_failed'].includes(run.status)) throw new MigrationHttpError(409, 'ROLLBACK_NOT_ALLOWED', 'Only an apply run with journaled changes can be rolled back.');
  const lock = await acquireLock(entities, user, runId);
  const changes = await filterAll(entities, 'IdentityMigrationChange', { run_id: runId }, '-sequence');
  if (!changes.length) {
    await releaseLock(entities, lock);
    throw new MigrationHttpError(404, 'JOURNAL_EMPTY', 'Migration run has no journaled changes.');
  }
  let reverted = changes.filter((change: any) => change.status === 'reverted').length;
  await entities.IdentityMigrationRun.update(run.id, { status: 'rolling_back', phase: 'rollback', rollback_started_at: run.rollback_started_at || new Date().toISOString(), lease_id: lock.lease_id });
  try {
    for (let index = 0; index < changes.length; index += 1) {
      if (index % 25 === 0) {
        await heartbeat(entities, lock);
        await entities.IdentityMigrationRun.update(run.id, { cursor: String(index), reverted_change_count: reverted, last_heartbeat_at: new Date().toISOString() });
      }
      if (await rollbackChange(entities, changes[index])) reverted += 1;
    }
    await entities.IdentityMigrationRun.update(run.id, { status: 'rolled_back', phase: 'complete', cursor: String(changes.length), reverted_change_count: reverted, rollback_completed_at: new Date().toISOString(), failure_message: '' });
    return { rolled_back: true, replay: reverted === 0, run_id: runId, reverted_changes: reverted };
  } catch (error) {
    await entities.IdentityMigrationRun.update(run.id, { status: 'rollback_failed', reverted_change_count: reverted, failure_message: text(error?.message || error).slice(0, 1000) }).catch(() => null);
    throw error;
  } finally {
    await releaseLock(entities, lock);
  }
}

async function migrationStatus(entities: any, payload: any) {
  const run = await findRun(entities, text(payload.run_id));
  const [changes, issues] = await Promise.all([
    filterAll(entities, 'IdentityMigrationChange', { run_id: run.run_id }, 'sequence'),
    filterAll(entities, 'IdentityMigrationIssue', { run_id: run.run_id }, 'created_date'),
  ]);
  const changeStatuses = Object.fromEntries(['planned', 'applied', 'reverted', 'failed'].map((status) => [status, changes.filter((change: any) => change.status === status).length]));
  const issueCounts = Object.fromEntries(['blocking', 'warning'].map((severity) => [severity, issues.filter((entry: any) => entry.severity === severity).length]));
  return { run_id: run.run_id, mode: run.mode, status: run.status, phase: run.phase || '', source_preflight_run_id: run.source_preflight_run_id || '', preflight_hash: run.preflight_hash || '', disposition_hash: run.disposition_hash || '', counts: run.counts || {}, journal: { total: changes.length, ...changeStatuses }, issues: issueCounts, started_at: run.started_at, completed_at: run.completed_at || null, rollback_completed_at: run.rollback_completed_at || null, failure_message: run.failure_message || '' };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const context = await requireAdminContext(req);
    if ('error' in context) return context.error;
    const payload = await req.json().catch(() => ({}));
    if (payload.action === 'status') return Response.json(await migrationStatus(context.entities, payload));
    if (payload.action === 'apply') return Response.json(await applyMigration(context.entities, context.user, payload));
    if (payload.action === 'rollback') return Response.json(await rollbackMigration(context.entities, context.user, payload));
    if (payload.action !== undefined && payload.action !== 'dry_run') return Response.json({ error: 'Unsupported action' }, { status: 400 });

    const snapshot = await buildSnapshot(context.entities, payload);
    const blocked = snapshot.issues.some((entry: any) => entry.severity === 'blocking');
    const run = await createRun(context.entities, context.user, 'dry_run', blocked ? 'blocked' : 'completed', snapshot);
    await context.entities.IdentityMigrationRun.update(run.id, { phase: 'complete', completed_at: new Date().toISOString() });
    return Response.json({
      dry_run: true,
      run_id: run.run_id,
      status: blocked ? 'blocked' : 'completed',
      preflight_hash: snapshot.preflightHash,
      disposition_hash: snapshot.dispositionHash,
      counts: { ...snapshot.counts, planned_changes: snapshot.changes.length, issues: snapshot.issues.length },
      changes: snapshot.changes.map((change: any) => ({ entity_name: change.entity_name, entity_id: change.entity_id || null, operation: change.operation, fields: Object.keys(change.after) })),
      issues: snapshot.issues,
    });
  } catch (error) {
    if (error instanceof MigrationHttpError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
    console.error('[identityMigration] failed', error?.message || String(error));
    return Response.json({ error: 'Identity migration failed. Review function logs before retrying.' }, { status: 500 });
  }
});
