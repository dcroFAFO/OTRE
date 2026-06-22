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
    const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);

    if (!isValid || code.length !== 6) {
      return Response.json({ error: 'Enter the 6-digit code sent to your mobile.' }, { status: 400 });
    }

    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!authToken) {
      console.error('TWILIO_AUTH_TOKEN is not configured.');
      return Response.json({ error: 'SMS verification is not configured.' }, { status: 500 });
    }

    const records = await base44.asServiceRole.entities.PhoneVerification.filter(
      { phone_e164: phoneE164, purpose: 'signup' },
      '-created_date',
      10
    );
    const now = Date.now();
    const record = records.find((item) => !item.consumed_at && new Date(item.expires_at).getTime() > now);

    if (!record) {
      return Response.json({ error: 'That code has expired. Please request a new code.' }, { status: 400 });
    }

    if ((record.attempts || 0) >= 5) {
      return Response.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
    }

    const codeHash = await sha256(`${phoneE164}:${code}:${authToken}`);
    if (codeHash !== record.code_hash) {
      await base44.asServiceRole.entities.PhoneVerification.update(record.id, {
        attempts: (record.attempts || 0) + 1,
      });
      return Response.json({ error: 'Invalid code. Please try again.' }, { status: 400 });
    }

    await base44.asServiceRole.entities.PhoneVerification.update(record.id, {
      consumed_at: new Date().toISOString(),
      attempts: (record.attempts || 0) + 1,
    });

    return Response.json({ verified: true, phone_e164: phoneE164 });
  } catch (error) {
    console.error('verifySignupPhoneOtp error:', error);
    return Response.json({ error: error.message || 'Could not verify mobile code.' }, { status: 500 });
  }
});