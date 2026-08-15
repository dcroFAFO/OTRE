import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('every entity schema is valid JSON', () => {
  const directory = path.join(root, 'base44', 'entities');
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.jsonc'))) {
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')), file);
  }
});

test('User exposes exactly admin and customer roles', () => {
  const schema = JSON.parse(read('base44', 'entities', 'User.jsonc'));
  const customer = JSON.parse(read('base44', 'entities', 'Customer.jsonc'));
  assert.deepEqual(schema.properties.role.enum, ['admin', 'customer']);
  assert.equal(schema.properties.role.default, 'customer');
  assert.equal(customer.properties.user_id.unique, true);
});

test('identity proof and claim records are closed to direct clients', () => {
  for (const file of ['CustomerIdentityLink.jsonc', 'ContactVerificationChallenge.jsonc', 'VerificationUse.jsonc', 'BookingClaim.jsonc', 'IdentityOperation.jsonc']) {
    const schema = JSON.parse(read('base44', 'entities', file));
    assert.deepEqual(schema.rls, { create: false, read: false, update: false, delete: false }, file);
  }
});

test('legacy spoofable link workflows have no remaining references', () => {
  const workflowDirectory = path.join(root, 'base44', 'workflows');
  const workflowText = fs.readdirSync(workflowDirectory).filter((name) => name.endsWith('.jsonc')).map((name) => fs.readFileSync(path.join(workflowDirectory, name), 'utf8')).join('\n');
  assert.doesNotMatch(workflowText, /assignCustomerIdToNewUser|createCustomerForUser|linkJobToCustomer/);
  for (const functionName of ['assignCustomerIdToNewUser', 'createCustomerForUser', 'linkJobToCustomer']) {
    assert.equal(fs.existsSync(path.join(root, 'base44', 'functions', functionName, 'entry.ts')), false, functionName);
  }
});

test('booking and claim functions use proof reservation and guest grant revocation', () => {
  const booking = read('base44', 'functions', 'createBooking', 'entry.ts');
  const claim = read('base44', 'functions', 'claimCustomerJobs', 'entry.ts');
  assert.match(booking, /reserveVerificationProof/);
  assert.match(booking, /ensureCanonicalCustomer/);
  assert.doesNotMatch(booking, /Customer\.filter\(\{\s*email|CustomerProfile\.filter\(\{\s*email/);
  assert.match(claim, /revokeGuestGrants/);
  assert.match(claim, /customer_account_id:\s*customer\.id/);
  assert.doesNotMatch(claim, /Job\.filter\(\{\s*customer_email/);
});

test('identity migration never matches ownership by contact details', () => {
  const migration = read('base44', 'functions', 'identityMigration', 'entry.ts');
  assert.match(migration, /Contact data was deliberately not used/);
  assert.doesNotMatch(migration, /Customer\.filter\(\{\s*email|Customer\.filter\(\{\s*phone|customer_email|customer_phone/);
  assert.match(migration, /payload\.confirm !== 'APPLY_IDENTITY_V2'/);
  assert.match(migration, /role:\s*normalizeRoleValue\(change\.before\?\.role\)/);
  assert.doesNotMatch(migration, /identity_version:\s*change\.before\?\.identity_version\s*\|\|\s*2/);
});

test('public tracking grants keep status, booking, and file capabilities separate', () => {
  const tracking = read('base44', 'functions', 'publicJobAccessActions', 'entry.ts');
  const booking = read('base44', 'functions', 'createBooking', 'entry.ts');
  const schema = JSON.parse(read('base44', 'entities', 'PublicJobAccess.jsonc'));

  assert.match(tracking, /canViewStatus\s*\?\s*\{[^}]*status:/);
  assert.match(tracking, /canViewBooking\s*\?\s*publicBooking\(job\)/);
  assert.doesNotMatch(tracking.match(/function publicBooking[\s\S]*?\n\}/)?.[0] || '', /\bstatus\b|completed_at|updated_date/);
  assert.match(tracking, /action === ["']list_files["'][\s\S]*!hasPermission\(access, ["']view_files["']\)/);
  assert.match(tracking, /action === ["']download_file["'][\s\S]*!hasPermission\(access, ["']view_files["']\)/);
  assert.match(tracking, /Deno\.env\.get\(["']PRIVATE_UPLOADS_ENABLED["']\) !== ["']true["']/);
  assert.doesNotMatch(tracking, /hasPermission\(access, ["']view_files["']\)\s*\|\|\s*hasPermission\(access, ["']view_booking["']\)/);
  assert.match(tracking, /expiry !== null && expiry <= Date\.now\(\)/);
  assert.doesNotMatch(booking, /DEFAULT_PERMISSIONS\s*=\s*\[[^\]]*["']view_files["']/);
  assert.equal(schema.properties.permissions.default.includes('view_files'), false);
  assert.equal(schema.properties.expires_after_completion_days.maximum, 30);
});

test('entity RLS never authorizes mutable profile fields or legacy roles', () => {
  const directory = path.join(root, 'base44', 'entities');
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.jsonc'))) {
    const schema = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
    const policy = JSON.stringify(schema.rls || {});
    assert.doesNotMatch(policy, /user\.data|data\.customer_id|data\.auth_user_id|data\.user_id|is_customer/, file);
    assert.doesNotMatch(policy, /"role":"(?:customer|staff|employee|technician|user)"/, file);
  }
});

test('notification outbox handles every actively emitted event type', () => {
  const outbox = read('base44', 'functions', 'processNotificationOutbox', 'entry.ts');
  const settings = read('base44', 'functions', 'customerSettings', 'entry.ts');
  for (const eventType of [
    'booking_request',
    'job_scheduled',
    'repair_started',
    'repair_completed',
    'invoice_issued',
    'invoice_paid',
    'invoice_reminder',
    'feedback_request',
  ]) {
    assert.match(outbox, new RegExp(`type === ["']${eventType}["']`), eventType);
  }
  assert.doesNotMatch(settings, /NotificationEvent\.(?:create|bulkCreate)/);
});

test('signup phone OTP uses delivery state, hashed multi-scope limits, and one-time reservations', () => {
  const send = read('base44', 'functions', 'sendSignupPhoneOtp', 'entry.ts');
  const verify = read('base44', 'functions', 'verifySignupPhoneOtp', 'entry.ts');
  const claim = read('base44', 'functions', 'claimSignupPhoneVerification', 'entry.ts');

  assert.match(send, /signup-otp:phone:/);
  assert.match(send, /signup-otp:email:/);
  assert.match(send, /delivery_status:\s*["']sending["']/);
  assert.match(send, /delivery_status:\s*["']sent["']/);
  assert.match(send, /delivery_status:\s*["']failed["']/);
  assert.doesNotMatch(send, /Twilio send failed:[\s\S]*details/);
  assert.match(verify, /PhoneVerificationAttempt\.create/);
  assert.match(verify, /PhoneVerificationProof\.create/);
  assert.match(claim, /PhoneVerificationUse\.create/);
  assert.match(claim, /auth\.me/);
  assert.match(claim, /User\.update/);
  assert.match(verify, /constantTimeEqual/);
  assert.match(claim, /constantTimeEqual/);
  for (const file of ['PhoneVerificationAttempt.jsonc', 'PhoneVerificationProof.jsonc', 'PhoneVerificationUse.jsonc']) {
    const schema = JSON.parse(read('base44', 'entities', file));
    assert.deepEqual(schema.rls, { create: false, read: false, update: false, delete: false }, file);
  }
});

test('job bulk removal is an audited archive and never a browser delete', () => {
  const service = read('src', 'services', 'jobService.js');
  const bulk = read('src', 'components', 'dashboard', 'job', 'BulkActionsBar.jsx');
  const actions = read('base44', 'functions', 'jobActions', 'entry.ts');
  assert.match(service, /action:\s*"archive"/);
  assert.match(actions, /case\s+"archive"/);
  assert.match(actions, /eventType:\s*"job_archived"/);
  assert.doesNotMatch(bulk, /entities\.Job\.delete|integrations\.Core\.SendEmail/);
});

test('public blog returns DTOs for settings and taxonomy', () => {
  const source = read('base44', 'functions', 'publicBlog', 'entry.ts');
  assert.match(source, /settingsPublic/);
  assert.match(source, /categoryPublic/);
  assert.match(source, /tagPublic/);
  assert.doesNotMatch(source, /return Response\.json\(\{ settings:\s*rawSettings/);
});

test('signature finalization enforces a server-owned policy', () => {
  const source = read('base44', 'functions', 'attachmentActions', 'entry.ts');
  assert.match(source, /SIGNATURE_POLICIES/);
  assert.match(source, /consent_mismatch/);
  assert.match(source, /allowedJobStatuses/);
  assert.match(source, /downloadable:\s*record\.storage === 'private' && Boolean\(record\.file_uri\)/);
  assert.match(source, /Deno\.env\.get\('PRIVATE_UPLOADS_ENABLED'\) === 'true'/);
});

test('staff customer tools use server DTO and mutation boundaries', () => {
  const customerRead = read('base44', 'functions', 'customerRead', 'entry.ts');
  const customerWrite = read('base44', 'functions', 'customerWrite', 'entry.ts');
  const clientService = read('src', 'services', 'clientService.js');
  const createJob = read('src', 'components', 'dashboard', 'job', 'CreateJobModal.jsx');
  const referral = read('src', 'components', 'dashboard', 'job', 'mobile', 'ReferralCard.jsx');
  const assets = read('src', 'pages', 'AssetManagement.jsx');
  const notesSchema = JSON.parse(read('base44', 'entities', 'CustomerNote.jsonc'));

  assert.match(customerRead, /payload\.action === "search"/);
  assert.match(customerRead, /payload\.action === "listNotes"/);
  assert.match(customerWrite, /action === 'addNote'/);
  assert.doesNotMatch(clientService, /entities\.(?:Customer|CustomerNote)/);
  assert.doesNotMatch(createJob, /entities\.Customer/);
  assert.doesNotMatch(referral, /entities\.Customer/);
  assert.doesNotMatch(assets, /entities\.Customer/);
  assert.deepEqual(notesSchema.rls, { create: false, read: false, update: false, delete: false });
});
