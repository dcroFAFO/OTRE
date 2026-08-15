import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { checkRateLimit, clientIpThrottle } from "../../shared/rateLimit.ts";

const MAX_ATTEMPTS = 5;
const MAX_VERIFY_PER_IP = 30;
const MAX_GLOBAL_VERIFICATIONS = 3000;
const MAX_VERIFY_PER_PHONE = 10;
const PROOF_LIFETIME_MS = 30 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhoneToE164(localNumber) {
  let cleaned = String(localNumber || "").trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+61")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("61")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  const phoneE164 = `+61${cleaned.replace(/\D/g, "")}`;
  return { phoneE164, isValid: /^\+614\d{8}$/.test(phoneE164) };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 320);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(value)),
  );
  return Array.from(new Uint8Array(digest)).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function scopeHash(secret, label, value) {
  return await sha256(`${secret}:${label}:${String(value || "")}`);
}

function randomProof() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function reserveAttempt(db, verificationId, requestIpHash) {
  for (let sequence = 1; sequence <= MAX_ATTEMPTS; sequence += 1) {
    const attemptKey = `${verificationId}:${sequence}`;
    const found = await db.PhoneVerificationAttempt.filter(
      { attempt_key: attemptKey },
      "-created_date",
      1,
    ).catch(() => []);
    if (found[0]) continue;
    try {
      return await db.PhoneVerificationAttempt.create({
        attempt_key: attemptKey,
        phone_verification_id: verificationId,
        sequence,
        request_ip_hash: requestIpHash,
        attempted_at: new Date().toISOString(),
      });
    } catch (error) {
      const raced = await db.PhoneVerificationAttempt.filter(
        { attempt_key: attemptKey },
        "-created_date",
        1,
      ).catch(() => []);
      if (!raced[0]) throw error;
    }
  }
  return null;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, {
        status: 405,
        headers: { Allow: "POST" },
      });
    }

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const { phoneE164, isValid } = normalizePhoneToE164(body.phone);
    const email = normalizeEmail(body.email);
    const code = String(body.code || "").replace(/\D/g, "").slice(0, 6);
    if (!isValid || !EMAIL_PATTERN.test(email) || code.length !== 6) {
      return Response.json({
        error:
          "Enter the same valid email, mobile number, and 6-digit code used to sign up.",
      }, { status: 400 });
    }

    const otpPepper = Deno.env.get("SIGNUP_OTP_PEPPER") || "";
    const rateSecret = Deno.env.get("OTP_RATE_LIMIT_SECRET") || "";
    if (otpPepper.length < 32 || rateSecret.length < 32) {
      console.error("[verifySignupPhoneOtp] SMS provider is not configured.");
      return Response.json({ error: "SMS verification is not configured." }, {
        status: 500,
      });
    }
    const ipThrottle = clientIpThrottle(
      req,
      MAX_VERIFY_PER_IP,
      MAX_GLOBAL_VERIFICATIONS,
    );
    const [ipKey, phoneKey, emailKey] = await Promise.all([
      scopeHash(rateSecret, "ip", ipThrottle.key),
      scopeHash(rateSecret, "phone", phoneE164),
      scopeHash(rateSecret, "email", email),
    ]);
    const [ipLimit, phoneLimit] = await Promise.all([
      checkRateLimit(base44, `verify-otp:ip:${ipKey}`, ipThrottle.limit),
      checkRateLimit(
        base44,
        `verify-otp:phone:${phoneKey}`,
        MAX_VERIFY_PER_PHONE,
      ),
    ]);
    if (!ipLimit.allowed || !phoneLimit.allowed) {
      return Response.json({
        error:
          "Too many verification attempts. Please wait and request a new code.",
      }, { status: 429 });
    }

    const records = await db.PhoneVerification.filter(
      { phone_e164: phoneE164, purpose: "signup" },
      "-created_date",
      10,
    );
    const now = Date.now();
    const record = records.find((item) =>
      !item.consumed_at &&
      !item.locked_at &&
      item.email_hash === emailKey &&
      (!item.delivery_status || item.delivery_status === "sent") &&
      Number.isFinite(new Date(item.expires_at).getTime()) &&
      new Date(item.expires_at).getTime() > now
    );
    if (!record) {
      return Response.json({
        error: "That code has expired. Please request a new code.",
      }, { status: 400 });
    }

    const existingProof = await db.PhoneVerificationProof.filter(
      { phone_verification_id: record.id },
      "-created_date",
      1,
    ).catch(() => []);
    if (existingProof[0]) {
      return Response.json({
        error:
          "That mobile code was already verified. Continue the existing signup or request a new code.",
      }, { status: 409 });
    }

    const attempt = await reserveAttempt(db, record.id, ipKey);
    if (!attempt) {
      await db.PhoneVerification.update(record.id, {
        attempts: MAX_ATTEMPTS,
        locked_at: new Date().toISOString(),
      }).catch(() => null);
      return Response.json({
        error: "Too many attempts. Please request a new code.",
      }, { status: 429 });
    }

    const codeHash = await sha256(`${phoneE164}:${code}:${otpPepper}`);
    if (!constantTimeEqual(codeHash, record.code_hash)) {
      const lockedAt = attempt.sequence >= MAX_ATTEMPTS
        ? new Date().toISOString()
        : undefined;
      await db.PhoneVerification.update(record.id, {
        attempts: attempt.sequence,
        locked_at: lockedAt,
      }).catch(() => null);
      return Response.json({
        error: attempt.sequence >= MAX_ATTEMPTS
          ? "Too many attempts. Please request a new code."
          : "Invalid code. Please try again.",
      }, { status: attempt.sequence >= MAX_ATTEMPTS ? 429 : 400 });
    }

    const verificationProof = randomProof();
    const proofExpiresAt = new Date(Date.now() + PROOF_LIFETIME_MS)
      .toISOString();
    let proofRecord;
    try {
      proofRecord = await db.PhoneVerificationProof.create({
        phone_verification_id: record.id,
        attempt_id: attempt.id,
        proof_hash: await sha256(verificationProof),
        email,
        phone_e164: phoneE164,
        issued_at: new Date().toISOString(),
        proof_expires_at: proofExpiresAt,
      });
    } catch {
      const reserved = await db.PhoneVerificationProof.filter(
        { phone_verification_id: record.id },
        "-created_date",
        1,
      ).catch(() => []);
      if (reserved[0]) {
        return Response.json({
          error:
            "That mobile code was already verified. Continue the existing signup or request a new code.",
        }, { status: 409 });
      }
      throw new Error("verification_proof_reservation_failed");
    }

    await db.PhoneVerificationAttempt.update(attempt.id, { matched: true })
      .catch(() => null);
    await db.PhoneVerification.update(record.id, {
      attempts: attempt.sequence,
      verified_at: proofRecord.issued_at,
      proof_id: proofRecord.id,
    }).catch(() => null);
    return Response.json({
      verified: true,
      phone_e164: phoneE164,
      verification_id: record.id,
      verification_proof: verificationProof,
      proof_expires_at: proofExpiresAt,
    });
  } catch (error) {
    console.error("[verifySignupPhoneOtp] failed:", errorMessage(error));
    return Response.json({
      error: "Could not verify the mobile code. Please try again.",
    }, { status: 500 });
  }
});
