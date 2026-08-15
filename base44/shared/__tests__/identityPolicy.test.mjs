import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticatedRole,
  customerJobDto,
  isAdmin,
  ownsCanonicalJob,
  trackingExpiry,
} from '../identityPolicy.ts';

test('only top-level authenticated role is authoritative', () => {
  assert.equal(authenticatedRole({ id: 'u1', role: 'customer', data: { role: 'admin' } }), 'customer');
  assert.equal(isAdmin({ id: 'u1', role: 'customer', data: { role: 'admin' } }), false);
  assert.equal(authenticatedRole({ id: 'u2', role: 'technician', data: { role: 'admin' } }), 'customer');
});

test('runtime authorization fails closed for legacy and unknown roles', () => {
  assert.equal(authenticatedRole({ role: 'admin' }), 'admin');
  for (const role of ['customer', 'staff', 'employee', 'technician', 'user', 'unknown', '', null, undefined]) {
    assert.equal(authenticatedRole({ role }), 'customer');
  }
});

test('job ownership requires canonical Customer.id', () => {
  const customer = { id: 'customer-1', customer_id: 'legacy-1', user_id: 'user-1' };
  assert.equal(ownsCanonicalJob(customer, { customer_account_id: 'customer-1' }), true);
  assert.equal(ownsCanonicalJob(customer, { customer_user_id: 'user-1' }), false);
  assert.equal(ownsCanonicalJob(customer, { customer_id: 'legacy-1' }), false);
});

test('customer job DTO excludes internal and identity fields', () => {
  const dto = customerJobDto({
    id: 'job-1', reference: 'OTR-1', status: 'requested', customer_email: 'secret@example.com',
    customer_account_id: 'customer-1', private_notes: 'internal', verified_contact_hash: 'hash',
  });
  assert.equal(dto.id, 'job-1');
  assert.equal('customer_email' in dto, false);
  assert.equal('customer_account_id' in dto, false);
  assert.equal('private_notes' in dto, false);
  assert.equal('verified_contact_hash' in dto, false);
});

test('tracking expires at the earlier explicit date or 30 days after completion', () => {
  const completedAt = '2026-01-01T00:00:00.000Z';
  assert.equal(trackingExpiry({ status: 'completed', completed_at: completedAt }, {})?.toISOString(), '2026-01-31T00:00:00.000Z');
  assert.equal(trackingExpiry({ status: 'completed', completed_at: completedAt }, { expiresAt: '2026-01-10T00:00:00.000Z' })?.toISOString(), '2026-01-10T00:00:00.000Z');
  assert.equal(trackingExpiry({ status: 'completed' }, {})?.getTime(), 0);
  assert.equal(trackingExpiry({ status: 'requested' }, {}), null);
});
