import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizePhoneToE164(localNumber) {
  let cleaned = String(localNumber || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  const phoneE164 = `+61${cleaned.replace(/\D/g, '')}`;
  return {
    phoneE164,
    isValid: /^\+614\d{8}$/.test(phoneE164),
  };
}

function maskPhone(phoneE164) {
  return phoneE164.replace(/^(\+614)\d{5}(\d{3})$/, '$1•••••$2');
}

function createCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { phoneE164, isValid } = normalizePhoneToE164(body.phone);
    const email = String(body.email || '').trim().toLowerCase();

    if (!isValid) {
      return Response.json({ error: 'Enter a valid Australian mobile number.' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      console.error('Twilio environment variables are not configured.');
      return Response.json({ error: 'SMS verification is not configured.' }, { status: 500 });
    }

    const recent = await base44.asServiceRole.entities.PhoneVerification.filter(
      { phone_e164: phoneE164, purpose: 'signup' },
      '-created_date',
      5
    );
    const oneMinuteAgo = Date.now() - 60 * 1000;
    const justSent = recent.some((record) => !record.consumed_at && new Date(record.created_date).getTime() > oneMinuteAgo);

    if (justSent) {
      return Response.json({ error: 'Please wait a minute before requesting another code.' }, { status: 429 });
    }

    const code = createCode();
    const codeHash = await sha256(`${phoneE164}:${code}:${authToken}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.PhoneVerification.create({
      phone_e164: phoneE164,
      email,
      purpose: 'signup',
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
    });

    const smsBody = `Your OTR Scooters verification code is ${code}. It expires in 10 minutes.`;
    const params = new URLSearchParams({ To: phoneE164, From: fromNumber, Body: smsBody });
    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!twilioResponse.ok) {
      const details = await twilioResponse.text();
      console.error('Twilio send failed:', details);
      return Response.json({ error: 'Could not send the SMS code. Please check the mobile number and try again.' }, { status: 502 });
    }

    return Response.json({ sent: true, phone_e164: phoneE164, masked_phone: maskPhone(phoneE164) });
  } catch (error) {
    console.error('sendSignupPhoneOtp error:', error);
    return Response.json({ error: error.message || 'Could not send verification code.' }, { status: 500 });
  }
});