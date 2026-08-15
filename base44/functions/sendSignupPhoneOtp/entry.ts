import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { checkRateLimit, clientIpThrottle } from "../../shared/rateLimit.ts";

const MAX_SENDS_PER_IP = 8;
const MAX_GLOBAL_SENDS = 500;
const MAX_SENDS_PER_PHONE = 4;
const MAX_SENDS_PER_EMAIL = 4;
const RESEND_COOLDOWN_MS = 60 * 1000;
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

function maskPhone(phoneE164) {
  return phoneE164.replace(/^(\+614)\d{5}(\d{3})$/, "$1•••••$2");
}

function createCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
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
    if (!isValid || !EMAIL_PATTERN.test(email)) {
      return Response.json(
        { error: "Enter a valid email address and Australian mobile number." },
        { status: 400 },
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    const rateSecret = Deno.env.get("OTP_RATE_LIMIT_SECRET") || "";
    const otpPepper = Deno.env.get("SIGNUP_OTP_PEPPER") || "";
    if (
      !accountSid || !authToken || !fromNumber || rateSecret.length < 32 ||
      otpPepper.length < 32 || otpPepper === authToken
    ) {
      console.error("[sendSignupPhoneOtp] SMS provider is not configured.");
      return Response.json({ error: "SMS verification is not configured." }, {
        status: 500,
      });
    }
    const ipThrottle = clientIpThrottle(
      req,
      MAX_SENDS_PER_IP,
      MAX_GLOBAL_SENDS,
    );
    const [ipKey, phoneKey, emailKey] = await Promise.all([
      scopeHash(rateSecret, "ip", ipThrottle.key),
      scopeHash(rateSecret, "phone", phoneE164),
      scopeHash(rateSecret, "email", email),
    ]);
    const limits = await Promise.all([
      checkRateLimit(base44, `signup-otp:ip:${ipKey}`, ipThrottle.limit),
      checkRateLimit(
        base44,
        `signup-otp:phone:${phoneKey}`,
        MAX_SENDS_PER_PHONE,
      ),
      checkRateLimit(
        base44,
        `signup-otp:email:${emailKey}`,
        MAX_SENDS_PER_EMAIL,
      ),
    ]);
    if (limits.some((limit) => !limit.allowed)) {
      return Response.json({
        error:
          "Too many verification codes were requested. Please wait a few minutes and try again.",
      }, { status: 429 });
    }

    const recent = await db.PhoneVerification.filter(
      { phone_e164: phoneE164, purpose: "signup" },
      "-created_date",
      5,
    );
    const oneMinuteAgo = Date.now() - RESEND_COOLDOWN_MS;
    const justSent = recent.some((record) =>
      !record.consumed_at &&
      record.delivery_status !== "failed" &&
      new Date(record.created_date).getTime() > oneMinuteAgo
    );
    if (justSent) {
      return Response.json({
        error: "Please wait a minute before requesting another code.",
      }, { status: 429 });
    }

    const code = createCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const challenge = await db.PhoneVerification.create({
      phone_e164: phoneE164,
      email_hash: emailKey,
      purpose: "signup",
      code_hash: await sha256(`${phoneE164}:${code}:${otpPepper}`),
      expires_at: expiresAt,
      attempts: 0,
      delivery_channel: "sms",
      delivery_status: "sending",
      request_ip_hash: ipKey,
    });

    let twilioResponse;
    try {
      twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phoneE164,
            From: fromNumber,
            Body:
              `Your On The Run Electrics verification code is ${code}. It expires in 10 minutes.`,
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (error) {
      await db.PhoneVerification.update(challenge.id, {
        delivery_status: "ambiguous",
        delivery_failed_at: new Date().toISOString(),
      }).catch(() => null);
      console.error(
        "[sendSignupPhoneOtp] provider request was ambiguous:",
        errorMessage(error),
      );
      return Response.json({
        error:
          "Could not confirm that the SMS code was sent. Please wait a minute and try again.",
      }, { status: 502 });
    }

    if (!twilioResponse.ok) {
      await twilioResponse.arrayBuffer().catch(() => null);
      await db.PhoneVerification.update(challenge.id, {
        delivery_status: "failed",
        delivery_failed_at: new Date().toISOString(),
      }).catch(() => null);
      console.error(
        "[sendSignupPhoneOtp] provider rejected SMS request:",
        twilioResponse.status,
      );
      return Response.json({
        error:
          "Could not send the SMS code. Please check the mobile number and try again.",
      }, { status: 502 });
    }

    const provider = await twilioResponse.json().catch(() => ({}));
    await db.PhoneVerification.update(challenge.id, {
      delivery_status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_id: String(provider.sid || "").slice(0, 120),
    });
    return Response.json({
      sent: true,
      phone_e164: phoneE164,
      masked_phone: maskPhone(phoneE164),
    });
  } catch (error) {
    console.error("[sendSignupPhoneOtp] failed:", errorMessage(error));
    return Response.json({
      error: "Could not send the verification code. Please try again.",
    }, { status: 500 });
  }
});
