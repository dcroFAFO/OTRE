import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkRateLimit } from "../rateLimit.ts";

const root = path.resolve(import.meta.dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const schema = (name) =>
  JSON.parse(read("base44", "entities", `${name}.jsonc`));
const closedRls = {
  create: false,
  read: false,
  update: false,
  delete: false,
};

test("rate limiting uses immutable unique hit reservations and a fail-closed proxy boundary", () => {
  const source = read("base44", "shared", "rateLimit.ts");
  const bucket = schema("RateLimit");
  const hit = schema("RateLimitHit");

  assert.equal(bucket.properties.bucket_key.unique, true);
  assert.equal(hit.properties.hit_key.unique, true);
  assert.deepEqual(hit.rls, closedRls);
  assert.match(source, /TRUST_PROXY_HEADERS["']\)\s*!==\s*["']true["']/);
  assert.match(source, /return ["']untrusted-proxy["']/);
  assert.match(source, /export function clientIpThrottle\(/);
  assert.match(source, /trusted \? trustedLimit : untrustedGlobalLimit/);
  assert.match(source, /scopeKey\s*=\s*`sha256:/);
  assert.match(source, /RateLimitHit\.create\(/);
  assert.match(source, /sequence\s*<=\s*limit\s*\+\s*1/);
  assert.match(
    source,
    /return \{ allowed: sequence <= limit, count: sequence \}/,
  );
  assert.doesNotMatch(
    source,
    /RateLimit\.update\([^)]*\{\s*count:\s*\([^)]*count/,
  );
});

test("public write paths use a global circuit breaker when proxy headers are untrusted", () => {
  const send = read("base44", "functions", "sendSignupPhoneOtp", "entry.ts");
  const verify = read("base44", "functions", "verifySignupPhoneOtp", "entry.ts");
  const bookingVerification = read("base44", "functions", "bookingVerification", "entry.ts");
  const booking = read("base44", "functions", "createBooking", "entry.ts");
  const feedback = read("base44", "functions", "submitFeedback", "entry.ts");

  for (const source of [send, verify, bookingVerification, booking, feedback]) {
    assert.match(source, /clientIpThrottle\(/);
  }
  assert.match(send, /MAX_GLOBAL_SENDS\s*=\s*500/);
  assert.match(verify, /MAX_GLOBAL_VERIFICATIONS\s*=\s*3000/);
  assert.match(booking, /MAX_GLOBAL_BOOKINGS\s*=\s*300/);
  assert.match(feedback, /MAX_GLOBAL_FEEDBACK\s*=\s*500/);
});

test("concurrent rate-limit callers cannot reserve more than the configured allowance", async () => {
  const buckets = new Map();
  const hits = new Map();
  let id = 0;
  const filter = (records, query) =>
    [...records.values()].filter((record) =>
      Object.entries(query).every(([key, value]) => record[key] === value)
    );
  const entities = {
    RateLimit: {
      filter: async (query) => filter(buckets, query),
      create: async (record) => {
        await new Promise((resolve) => setImmediate(resolve));
        if (buckets.has(record.bucket_key)) throw new Error("duplicate");
        const created = { ...record, id: `bucket-${++id}` };
        buckets.set(record.bucket_key, created);
        return created;
      },
      update: async (recordId, updates) => {
        const entry = [...buckets.entries()].find(([, value]) =>
          value.id === recordId
        );
        if (entry) buckets.set(entry[0], { ...entry[1], ...updates });
      },
    },
    RateLimitHit: {
      filter: async (query) => filter(hits, query),
      create: async (record) => {
        await new Promise((resolve) => setImmediate(resolve));
        if (hits.has(record.hit_key)) throw new Error("duplicate");
        const created = { ...record, id: `hit-${++id}` };
        hits.set(record.hit_key, created);
        return created;
      },
    },
  };
  const base44 = { asServiceRole: { entities } };

  const results = await Promise.all(
    Array.from({ length: 20 }, () => checkRateLimit(base44, "test:scope", 5)),
  );

  assert.equal(results.filter((result) => result.allowed).length, 5);
  assert.equal(hits.size, 6);
  assert.deepEqual(
    [...hits.values()].map((hit) => hit.sequence).sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6],
  );
});

test("booking verification reserves attempts and its successful proof exactly once", () => {
  const source = read("base44", "functions", "bookingVerification", "entry.ts");
  const verifyBody = source.match(
    /async function handleVerify[\s\S]*?\n}\n\nDeno\.serve/,
  )?.[0] || "";
  const attempt = schema("ContactVerificationAttempt");
  const proof = schema("ContactVerificationProof");

  assert.equal(attempt.properties.attempt_key.unique, true);
  assert.equal(attempt.properties.sequence.maximum, 5);
  assert.equal(proof.properties.challenge_id.unique, true);
  assert.equal(proof.properties.attempt_id.unique, true);
  assert.deepEqual(attempt.rls, closedRls);
  assert.deepEqual(proof.rls, closedRls);
  assert.match(source, /ContactVerificationAttempt\.create\(/);
  assert.match(source, /ContactVerificationProof\.create\(/);
  assert.match(source, /constantTimeEqual\(codeHash, record\.code_hash\)/);
  assert.match(source, /verificationPepper\(\)\}:proof:/);
  assert.match(source, /existingProofs[\s\S]*finalizeVerifiedChallenge/);
  assert.match(source, /current\.status === ["']consumed["']/);
  assert.match(
    source,
    /await entities\.ContactVerificationChallenge\.update\(challenge\.id/,
  );
  assert.doesNotMatch(
    source.match(/async function finalizeVerifiedChallenge[\s\S]*?\n}/)?.[0] ||
      "",
    /\.catch\(/,
  );
  assert.match(verifyBody, /booking-verification:verify:ip:/);
  assert.match(verifyBody, /booking-verification:verify:contact:/);
  assert.doesNotMatch(verifyBody, /status:\s*["']locked["']/);
  assert.doesNotMatch(
    verifyBody,
    /record\.attempt_count\s*\|\|\s*0\)\s*\+\s*1/,
  );
});

test("notification outbox uses event and delivery leases with conservative recovery", () => {
  const source = read(
    "base44",
    "functions",
    "processNotificationOutbox",
    "entry.ts",
  );
  const lease = schema("NotificationWorkLease");
  const event = schema("NotificationEvent");
  const delivery = schema("NotificationDelivery");

  assert.equal(lease.properties.lease_key.unique, true);
  assert.deepEqual(lease.rls, closedRls);
  assert.ok(event.properties.processing_lease_id);
  assert.ok(event.properties.lease_expires_at);
  assert.ok(delivery.properties.sending_lease_id);
  assert.ok(delivery.properties.lease_expires_at);
  assert.match(source, /NotificationWorkLease\.create\(/);
  assert.match(source, /acquireLease\([\s\S]*?["']event["']/);
  assert.match(source, /acquireLease\([\s\S]*?["']delivery["']/);
  assert.match(source, /\{ status:\s*["']processing["'] \}/);
  assert.match(source, /processing\.filter\(processingLeaseExpired\)/);
  assert.match(
    source,
    /recoveringUnconfirmedSend\s*&&\s*message\.channel\s*===\s*["']sms["']/,
  );
  assert.match(source, /sms_recovery_ambiguous/);
  assert.match(source, /response\.status >= 500[\s\S]*?["']ambiguous["']/);
  assert.match(source, /["']suppressed["']/);
  assert.match(
    source,
    /acquireLease\([\s\S]*?["']delivery["'][\s\S]*?NotificationDelivery\.get\(delivery\.id\)/,
  );
  assert.match(source, /["']Idempotency-Key["']:\s*delivery\.idempotency_key/);
  assert.match(source, /AbortSignal\.timeout\(PROVIDER_TIMEOUT_MS\)/);
  assert.match(
    source,
    /if \(!await leaseIsCurrent\(db, lease\)\) \{\s*return ["']deferred["'];\s*\}/,
  );
  assert.match(source, /const terminal = statuses\.every/);
  assert.match(source, /NotificationEvent\.get\(event\.id\)/);
});
