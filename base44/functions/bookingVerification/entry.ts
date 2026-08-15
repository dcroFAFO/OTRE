import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { checkRateLimit, clientIpThrottle } from "../../shared/rateLimit.ts";
import { contactHash, sha256 } from "../../shared/identityAuth.ts";
import {
  normalizeAustralianMobile,
  normalizeEmail,
} from "../../shared/identityPolicy.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SENDS_PER_IP = 8;
const MAX_GLOBAL_SENDS = 500;
const MAX_SENDS_PER_CONTACT = 4;
const MAX_VERIFY_PER_IP = 30;
const MAX_GLOBAL_VERIFICATIONS = 3000;
const MAX_VERIFY_PER_CONTACT = 10;
const MAX_CODE_ATTEMPTS = 5;
const CODE_LIFETIME_MS = 10 * 60 * 1000;
const PROOF_LIFETIME_MS = 30 * 60 * 1000;

function escapeHtml(value: unknown) {
  return String(value || "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

function createCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

function constantTimeEqual(left: unknown, right: unknown) {
  const a = String(left || "");
  const b = String(right || "");
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function maskDestination(channel: string, email: string, phone: string) {
  if (channel === "email") {
    const [local, domain] = email.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `${phone.slice(0, 4)}•••${phone.slice(-3)}`;
}

function verificationPepper() {
  const pepper = Deno.env.get("BOOKING_VERIFICATION_PEPPER");
  if (!pepper || pepper.length < 32) {
    throw new Error("Booking verification is not configured.");
  }
  return pepper;
}

async function sendSms({ to, body }: { to: string; body: string }) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!accountSid || !authToken || !from) {
    throw new Error("SMS verification is not configured.");
  }
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    },
  );
  if (!response.ok) {
    throw new Error(`Twilio SMS failed with status ${response.status}`);
  }
}

async function sendEmail({ to, subject, body, fromEmail, businessName }: any) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("Email verification is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${businessName} <${fromEmail}>`,
      to: [to],
      subject,
      html: body,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend send failed with status ${response.status}`);
  }
}

async function getBusinessContact(entities: any) {
  const profiles = await entities.BusinessProfile.filter(
    { is_default: true },
    "-updated_date",
    1,
  ).catch(() => []);
  const profile = profiles[0] ||
    (await entities.BusinessProfile.list("-updated_date", 1).catch(() => []))[
      0
    ] || {};
  const candidateEmail = normalizeEmail(
    profile.invoice_sender_email || profile.email,
  );
  return {
    businessName:
      String(profile.business_name || profile.name || "On The Run Electrics")
        .replace(/[<>\r\n]/g, "").trim() || "On The Run Electrics",
    fromEmail: /^[^\s@]+@ontherunelectrics\.com\.au$/i.test(candidateEmail)
      ? candidateEmail
      : "info@ontherunelectrics.com.au",
  };
}

async function reserveAttempt(
  entities: any,
  challenge: any,
  requestIpHash: string,
) {
  const maximum = Math.min(
    Math.max(Number(challenge.max_attempts) || MAX_CODE_ATTEMPTS, 1),
    MAX_CODE_ATTEMPTS,
  );
  for (let sequence = 1; sequence <= maximum; sequence += 1) {
    const attemptKey = `${challenge.challenge_id}:${sequence}`;
    const existing = await entities.ContactVerificationAttempt.filter(
      { attempt_key: attemptKey },
      "-created_date",
      1,
    ).catch(() => []);
    if (existing[0]) continue;
    try {
      return await entities.ContactVerificationAttempt.create({
        attempt_key: attemptKey,
        challenge_id: challenge.challenge_id,
        challenge_entity_id: challenge.id,
        sequence,
        request_ip_hash: requestIpHash,
        attempted_at: new Date().toISOString(),
        matched: false,
      });
    } catch (error) {
      const raced = await entities.ContactVerificationAttempt.filter(
        { attempt_key: attemptKey },
        "-created_date",
        1,
      ).catch(() => []);
      if (!raced[0]) throw error;
    }
  }
  return null;
}

async function reserveProof(
  entities: any,
  challenge: any,
  attempt: any,
  proof: string,
  verifiedAt: string,
  proofExpiresAt: string,
) {
  const proofHash = await sha256(proof);
  try {
    return await entities.ContactVerificationProof.create({
      challenge_id: challenge.challenge_id,
      challenge_entity_id: challenge.id,
      attempt_id: attempt.id,
      proof_hash: proofHash,
      verified_at: verifiedAt,
      proof_expires_at: proofExpiresAt,
    });
  } catch (error) {
    const existing = await entities.ContactVerificationProof.filter(
      { challenge_id: challenge.challenge_id },
      "-created_date",
      1,
    ).catch(() => []);
    if (existing[0] && constantTimeEqual(existing[0].proof_hash, proofHash)) {
      return existing[0];
    }
    throw error;
  }
}

async function finalizeVerifiedChallenge(
  entities: any,
  challenge: any,
  attempt: any,
  proofReservation: any,
) {
  const current = await entities.ContactVerificationChallenge.get(challenge.id);
  if (current.status === "consumed") {
    throw new Error("verification_already_consumed");
  }
  if (!["pending", "verified"].includes(current.status)) {
    throw new Error("verification_challenge_unavailable");
  }
  await entities.ContactVerificationAttempt.update(attempt.id, {
    matched: true,
  });
  // A verified row is already durably mirrored. Avoid another status write so
  // a concurrent one-time consumer cannot be regressed from consumed.
  if (current.status === "verified") return;
  // Downstream one-time use validates the challenge mirror. Do not acknowledge
  // verification unless that mirror is durable; a retry can recover from the
  // immutable proof reservation before consuming another attempt.
  await entities.ContactVerificationChallenge.update(challenge.id, {
    status: "verified",
    attempt_count: Number(attempt.sequence),
    last_attempt_id: attempt.id,
    proof_hash: proofReservation.proof_hash,
    proof_reservation_id: proofReservation.id,
    verified_at: proofReservation.verified_at,
    proof_expires_at: proofReservation.proof_expires_at,
  });
}

function verifiedResponse(challenge: any, proof: string, reservation: any) {
  return Response.json({
    verified: true,
    verification_id: `${challenge.challenge_id}.${proof}`,
    challenge_id: challenge.challenge_id,
    verification_proof: proof,
    verified_channel: challenge.channel,
    verified_at: reservation.verified_at,
    proof_expires_at: reservation.proof_expires_at,
  });
}

async function handleSend(base44: any, req: Request, body: any) {
  const entities = base44.asServiceRole.entities;
  const name = String(body.name || "").trim().slice(0, 160);
  const email = normalizeEmail(body.email);
  const phone = normalizeAustralianMobile(body.phone);
  const channel = body.channel === "email" ? "email" : "sms";
  const purpose = body.purpose === "guest_claim"
    ? "guest_claim"
    : "guest_booking";
  const jobId = purpose === "guest_claim"
    ? String(body.job_id || "").trim()
    : "";
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "A valid email address is required." }, {
      status: 400,
    });
  }
  if (!phone) {
    return Response.json({
      error: "A valid Australian mobile number is required.",
    }, { status: 400 });
  }

  const ipThrottle = clientIpThrottle(
    req,
    MAX_SENDS_PER_IP,
    MAX_GLOBAL_SENDS,
  );
  const ip = ipThrottle.key;
  const [ipLimit, fingerprint] = await Promise.all([
    checkRateLimit(base44, `booking-verification:ip:${ip}`, ipThrottle.limit),
    contactHash(email, phone),
  ]);
  const contactLimit = await checkRateLimit(
    base44,
    `booking-verification:contact:${fingerprint}`,
    MAX_SENDS_PER_CONTACT,
  );
  if (!ipLimit.allowed || !contactLimit.allowed) {
    return Response.json({
      error:
        "Too many verification codes were requested. Please wait and try again.",
    }, { status: 429 });
  }

  if (purpose === "guest_claim" && !jobId) {
    return Response.json(
      { error: "A job is required for claim verification." },
      { status: 400 },
    );
  }
  const recent = await entities.ContactVerificationChallenge.filter(
    { contact_hash: fingerprint, purpose },
    "-created_date",
    5,
  ).catch(() => []);
  if (
    recent.some((challenge: any) =>
      challenge.status === "pending" &&
      new Date(challenge.created_date).getTime() > Date.now() - 60_000
    )
  ) {
    return Response.json({
      error: "Please wait a minute before requesting another code.",
    }, { status: 429 });
  }

  const challengeId = crypto.randomUUID();
  const code = createCode();
  const destination = channel === "email" ? email : phone;
  const now = new Date();
  const challenge = await entities.ContactVerificationChallenge.create({
    challenge_id: challengeId,
    purpose,
    channel,
    destination_hash: await sha256(destination),
    contact_hash: fingerprint,
    code_hash: await sha256(`${verificationPepper()}:${challengeId}:${code}`),
    status: "pending",
    attempt_count: 0,
    max_attempts: 5,
    expires_at: new Date(now.getTime() + CODE_LIFETIME_MS).toISOString(),
    request_ip_hash: await sha256(ip),
    job_id: jobId,
  });

  try {
    if (channel === "email") {
      await sendEmail({
        to: email,
        subject: "Your verification code — On The Run Electrics",
        body: `<p>Hi ${
          escapeHtml(name || "there")
        },</p><p>Your verification code is <strong style="font-size:20px;">${code}</strong>. It expires in 10 minutes.</p>`,
        ...(await getBusinessContact(entities)),
      });
    } else {
      await sendSms({
        to: phone,
        body:
          `Your On The Run Electrics verification code is ${code}. It expires in 10 minutes.`,
      });
    }
  } catch (error) {
    await entities.ContactVerificationChallenge.update(challenge.id, {
      status: "locked",
    }).catch(() => null);
    throw error;
  }

  return Response.json({
    sent: true,
    channel,
    challenge_id: challengeId,
    destination: maskDestination(channel, email, phone),
  });
}

async function handleVerify(base44: any, req: Request, body: any) {
  const entities = base44.asServiceRole.entities;
  const email = normalizeEmail(body.email);
  const phone = normalizeAustralianMobile(body.phone);
  const code = String(body.code || "").replace(/\D/g, "").slice(0, 6);
  const purpose = body.purpose === "guest_claim"
    ? "guest_claim"
    : "guest_booking";
  const jobId = purpose === "guest_claim"
    ? String(body.job_id || "").trim()
    : "";
  if (!EMAIL_PATTERN.test(email) || !phone) {
    return Response.json({
      error: "Enter the same valid email and mobile used to request the code.",
    }, { status: 400 });
  }
  if (code.length !== 6) {
    return Response.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const ipThrottle = clientIpThrottle(
    req,
    MAX_VERIFY_PER_IP,
    MAX_GLOBAL_VERIFICATIONS,
  );
  const ip = ipThrottle.key;
  const fingerprint = await contactHash(email, phone);
  const [ipLimit, contactLimit, requestIpHash] = await Promise.all([
    checkRateLimit(
      base44,
      `booking-verification:verify:ip:${ip}`,
      ipThrottle.limit,
    ),
    checkRateLimit(
      base44,
      `booking-verification:verify:contact:${fingerprint}`,
      MAX_VERIFY_PER_CONTACT,
    ),
    sha256(ip),
  ]);
  if (!ipLimit.allowed || !contactLimit.allowed) {
    return Response.json({
      error:
        "Too many verification attempts. Please wait and request a new code.",
    }, { status: 429 });
  }
  const records = await entities.ContactVerificationChallenge.filter(
    { contact_hash: fingerprint, purpose },
    "-created_date",
    10,
  ).catch(() => []);
  const now = Date.now();
  const record = records.find((item: any) =>
    ["pending", "verified"].includes(item.status) &&
    Number.isFinite(new Date(item.expires_at).getTime()) &&
    new Date(item.expires_at).getTime() > now &&
    (purpose !== "guest_claim" || item.job_id === jobId)
  );
  if (!record) {
    return Response.json({
      error: "That code has expired. Please request a new code.",
    }, { status: 400 });
  }

  const codeHash = await sha256(
    `${verificationPepper()}:${record.challenge_id}:${code}`,
  );
  if (constantTimeEqual(codeHash, record.code_hash)) {
    const existingProofs = await entities.ContactVerificationProof.filter(
      { challenge_id: record.challenge_id },
      "-created_date",
      1,
    ).catch(() => []);
    if (existingProofs[0]) {
      const proof = await sha256(
        `${verificationPepper()}:proof:${record.challenge_id}:${record.code_hash}`,
      );
      if (
        !constantTimeEqual(existingProofs[0].proof_hash, await sha256(proof))
      ) {
        throw new Error("verification_proof_reservation_mismatch");
      }
      const reservedAttempt = await entities.ContactVerificationAttempt.get(
        existingProofs[0].attempt_id,
      ).catch(() => null);
      if (!reservedAttempt) {
        throw new Error("verification_attempt_reservation_missing");
      }
      await finalizeVerifiedChallenge(
        entities,
        record,
        reservedAttempt,
        existingProofs[0],
      );
      return verifiedResponse(record, proof, existingProofs[0]);
    }
  }

  const attempt = await reserveAttempt(entities, record, requestIpHash);
  if (!attempt) {
    // Immutable attempt reservations enforce the lock. Do not write a mutable
    // `locked` status here: it could race with a concurrent valid attempt and
    // overwrite the authoritative proof reservation's verified state.
    await entities.ContactVerificationChallenge.update(record.id, {
      attempt_count: MAX_CODE_ATTEMPTS,
    }).catch(() => null);
    return Response.json({
      error: "Too many attempts. Please request a new code.",
    }, { status: 429 });
  }

  if (!constantTimeEqual(codeHash, record.code_hash)) {
    const locked = Number(attempt.sequence) >= MAX_CODE_ATTEMPTS;
    // attempt_count is observability only; ContactVerificationAttempt uniqueness
    // is the authorization boundary and cannot regress under concurrent writes.
    await entities.ContactVerificationChallenge.update(record.id, {
      attempt_count: Number(attempt.sequence),
      last_attempt_id: attempt.id,
    }).catch(() => null);
    return Response.json({
      error: locked
        ? "Too many attempts. Please request a new code."
        : "Invalid code. Please try again.",
    }, { status: locked ? 429 : 400 });
  }

  // Deterministic under a server-only pepper so a successful reservation can be
  // recovered after a response/update crash without persisting the raw proof.
  const proof = await sha256(
    `${verificationPepper()}:proof:${record.challenge_id}:${record.code_hash}`,
  );
  const verifiedAt = new Date().toISOString();
  const proofExpiresAt = new Date(Date.now() + PROOF_LIFETIME_MS).toISOString();
  const proofReservation = await reserveProof(
    entities,
    record,
    attempt,
    proof,
    verifiedAt,
    proofExpiresAt,
  );
  await finalizeVerifiedChallenge(entities, record, attempt, proofReservation);

  // Compatibility: existing clients pass only verification_id. The value is an
  // opaque one-time credential containing both the challenge id and raw proof.
  return verifiedResponse(record, proof, proofReservation);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (body.action === "send") return await handleSend(base44, req, body);
    if (body.action === "verify") return await handleVerify(base44, req, body);
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error(
      "[bookingVerification] failed",
      error?.message || String(error),
    );
    return Response.json({
      error: "We could not complete verification just now. Please try again.",
    }, { status: 500 });
  }
});
