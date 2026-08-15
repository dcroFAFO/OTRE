import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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

test("signup SMS challenge is bound to normalized email before delivery", () => {
  const send = read("base44", "functions", "sendSignupPhoneOtp", "entry.ts");
  assert.match(
    send,
    /import \{ checkRateLimit, clientIpThrottle \} from "\.\.\/\.\.\/shared\/rateLimit\.ts"/,
  );
  assert.doesNotMatch(send, /function clientIp(?:Throttle)?\(/);
  assert.doesNotMatch(send, /async function checkRateLimit\(/);
  assert.match(send, /EMAIL_PATTERN\.test\(email\)/);
  assert.match(send, /scopeHash\(rateSecret, ["']email["'], email\)/);
  assert.match(send, /email_hash:\s*emailKey/);
  assert.match(send, /Deno\.env\.get\(["']SIGNUP_OTP_PEPPER["']\)/);
  assert.match(send, /otpPepper\.length < 32/);
  assert.match(send, /otpPepper === authToken/);
  assert.match(
    send,
    /code_hash:\s*await sha256\(`\$\{phoneE164\}:\$\{code\}:\$\{otpPepper\}`\)/,
  );
  assert.doesNotMatch(send, /code_hash:[^\n]*authToken/);
});

test("successful phone OTP returns a random proof and persists only its hash", () => {
  const verify = read(
    "base44",
    "functions",
    "verifySignupPhoneOtp",
    "entry.ts",
  );
  const proof = schema("PhoneVerificationProof");

  assert.match(
    verify,
    /import \{ checkRateLimit, clientIpThrottle \} from "\.\.\/\.\.\/shared\/rateLimit\.ts"/,
  );
  assert.doesNotMatch(verify, /function clientIp(?:Throttle)?\(/);
  assert.doesNotMatch(verify, /async function checkRateLimit\(/);
  assert.match(verify, /const email = normalizeEmail\(body\.email\)/);
  assert.match(verify, /item\.email_hash === emailKey/);
  assert.match(verify, /crypto\.getRandomValues\(bytes\)/);
  assert.match(verify, /PhoneVerificationProof\.create\(/);
  assert.match(verify, /proof_hash:\s*await sha256\(verificationProof\)/);
  assert.match(verify, /verification_proof:\s*verificationProof/);
  assert.doesNotMatch(verify, /PhoneVerificationUse\.create\(/);
  assert.match(verify, /Deno\.env\.get\(["']SIGNUP_OTP_PEPPER["']\)/);
  assert.match(
    verify,
    /codeHash\s*=\s*await sha256\(`\$\{phoneE164\}:\$\{code\}:\$\{otpPepper\}`\)/,
  );
  assert.doesNotMatch(verify, /Deno\.env\.get\(["']TWILIO_AUTH_TOKEN["']\)/);
  assert.equal(proof.properties.phone_verification_id.unique, true);
  assert.equal(proof.properties.attempt_id.unique, true);
  assert.deepEqual(proof.rls, closedRls);
});

test("authenticated claim binds proof to auth email and atomically updates phone verification", () => {
  const claim = read(
    "base44",
    "functions",
    "claimSignupPhoneVerification",
    "entry.ts",
  );
  const use = schema("PhoneVerificationUse");

  assert.match(claim, /base44\.auth\.me\(\)/);
  assert.match(claim, /user\.role !== ["']customer["']/);
  assert.match(claim, /normalizeEmail\(proof\.email\) !== email/);
  assert.match(
    claim,
    /constantTimeEqual\(await sha256\(rawProof\), proof\.proof_hash\)/,
  );
  assert.match(claim, /PhoneVerificationUse\.create\(/);
  assert.match(claim, /db\.User\.update\(user\.id/);
  assert.match(claim, /phone_verified:\s*true/);
  assert.match(claim, /use\.user_id === authenticatedUserId/);
  assert.match(claim, /use\.status !== ["']completed["']/);
  assert.equal(use.properties.phone_verification_id.unique, true);
  assert.equal(use.properties.proof_id.unique, true);
  assert.deepEqual(use.rls, closedRls);
});

test("Register claims the proof after email authentication and never asserts phone_verified", () => {
  const register = read("src", "pages", "Register.jsx");
  assert.match(
    register,
    /verifySignupPhoneOtp[\s\S]*?email,[\s\S]*?code:\s*phoneOtpCode/,
  );
  assert.match(register, /claimSignupPhoneVerification/);
  assert.match(
    register,
    /base44\.auth\.setToken\(result\.access_token\);[\s\S]*?await claimVerifiedPhone\(\)/,
  );
  assert.doesNotMatch(register, /auth\.updateMe\([\s\S]*?phone_verified/);
  assert.doesNotMatch(register, /phone_verified:\s*true/);
});

test("OAuth callbacks use nonce-bound onboarding and new customers complete the same phone claim", () => {
  const register = read("src", "pages", "Register.jsx");
  const login = read("src", "pages", "Login.jsx");
  const book = read("src", "pages", "BookAccount.jsx");

  assert.match(register, /createAuthCallbackTarget\(`\/register\?\$\{params\.toString\(\)\}`\)/);
  assert.match(book, /createAuthCallbackTarget\(`\/register\?\$\{callbackParams\.toString\(\)\}`\)/);
  assert.match(login, /createAuthCallbackTarget\(oauthOnboardingTarget\(next\)\)/);
  assert.match(login, /claim\.data\?\.code === ["']PHONE_VERIFICATION_REQUIRED["']/);
  assert.match(register, /setupError\?\.code === ["']PHONE_VERIFICATION_REQUIRED["']/);
  assert.match(register, /if \(oauthPhoneRequired\)[\s\S]*?claimVerifiedPhone\(issuedProof\)[\s\S]*?finishCustomerAccount/);
});

test("customer bootstrap requires the authenticated phone claim only for new customers", () => {
  const bootstrap = read(
    "base44",
    "functions",
    "claimCustomerJobs",
    "entry.ts",
  );
  const existingLookup = bootstrap.indexOf("findCanonicalCustomer(");
  const verificationLookup = bootstrap.indexOf(
    "entities.PhoneVerificationUse.filter(",
  );
  const customerCreation = bootstrap.indexOf("ensureCanonicalCustomer(");

  assert.match(bootstrap, /\{ user_id: user\.id, status: ["']completed["'] \}/);
  assert.match(bootstrap, /code:\s*["']PHONE_VERIFICATION_REQUIRED["']/);
  assert.match(bootstrap, /status:\s*403/);
  assert.ok(existingLookup >= 0);
  assert.ok(verificationLookup > existingLookup);
  assert.ok(customerCreation > verificationLookup);
  assert.match(
    bootstrap,
    /const customer = existingCustomer \|\| await ensureCanonicalCustomer/,
  );
});

test("every create-capable authenticated customer path enforces the phone claim", () => {
  const identity = read("base44", "shared", "identityAuth.ts");
  const appBootstrap = read(
    "base44",
    "functions",
    "appBootstrap",
    "entry.ts",
  );
  const createBooking = read(
    "base44",
    "functions",
    "createBooking",
    "entry.ts",
  );
  const settings = read(
    "base44",
    "functions",
    "customerSettings",
    "entry.ts",
  );

  const canonicalLookup = identity.indexOf("findCanonicalCustomer(");
  const phoneUseLookup = identity.indexOf(
    "entities.PhoneVerificationUse.filter(",
    canonicalLookup,
  );
  const customerCreate = identity.indexOf("entities.Customer.create(");
  assert.ok(canonicalLookup >= 0);
  assert.ok(phoneUseLookup > canonicalLookup);
  assert.ok(customerCreate > phoneUseLookup);
  assert.match(identity, /PHONE_VERIFICATION_REQUIRED/);

  assert.match(
    appBootstrap,
    /error\?\.code === ['"]PHONE_VERIFICATION_REQUIRED['"]/,
  );
  assert.match(
    createBooking,
    /phoneVerificationRequired = error\?\.code === ['"]PHONE_VERIFICATION_REQUIRED['"]/,
  );
  assert.match(settings, /db\.PhoneVerificationUse\.filter\(/);
  assert.match(settings, /error\.code === ["']PHONE_VERIFICATION_REQUIRED["']/);
});
