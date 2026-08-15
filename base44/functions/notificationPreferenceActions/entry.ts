import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const CHANNELS = new Set(['email', 'sms']);
const EVENT_KEY = 'feedback_request';

function requestId(req: Request) {
  return req.headers.get('x-request-id') || crypto.randomUUID();
}

function ok(data: unknown, id: string, status = 200) {
  return Response.json({ ok: true, data, request_id: id }, { status });
}

function fail(code: string, message: string, id: string, status: number) {
  return Response.json({ ok: false, error: { code, message }, request_id: id }, { status });
}

function clean(value: unknown, maxLength = 120) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

Deno.serve(async (req: Request) => {
  const id = requestId(req);
  try {
    if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST for this action.', id, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return fail('unauthorized', 'Sign in to manage notification preferences.', id, 401);
    if (user.role !== 'customer') return fail('forbidden', 'Customer notification preferences are managed from a customer account.', id, 403);
    const db = base44.asServiceRole.entities;
    const customers = await db.Customer.filter({ user_id: user.id }, '-updated_date', 2).catch(() => []);
    if (customers.length !== 1) return fail('profile_conflict', 'Your customer profile needs support review before preferences can be changed.', id, 409);
    const customer = customers[0];
    const body = await req.json().catch(() => ({}));
    const action = clean(body.action || 'get', 20);

    if (action === 'get') {
      const rows = await db.NotificationPreference.filter({ user_id: user.id, event_key: EVENT_KEY }, '-updated_date', 10).catch(() => []);
      const preferences = { email: false, sms: false };
      const conflicts: string[] = [];
      for (const channel of CHANNELS) {
        const matches = rows.filter((row: any) => row.channel === channel);
        if (matches.length > 1) conflicts.push(channel);
        if (matches.length === 1) preferences[channel] = matches[0].enabled === true && matches[0].consent_granted === true;
      }
      if (conflicts.length) return fail('preference_conflict', 'Duplicate notification preferences need administrator review.', id, 409);
      return ok({ event_key: EVENT_KEY, preferences, consent_optional: true }, id);
    }

    if (action === 'set') {
      const channel = clean(body.channel, 20);
      if (!CHANNELS.has(channel) || typeof body.enabled !== 'boolean') return fail('validation_error', 'Choose email or SMS and provide an enabled value.', id, 400);
      const consentVersion = clean(body.consent_version, 80);
      if (body.enabled && !consentVersion) return fail('validation_error', 'A consent notice version is required when opting in.', id, 400);
      const rows = await db.NotificationPreference.filter({ user_id: user.id, event_key: EVENT_KEY, channel }, '-updated_date', 2).catch(() => []);
      if (rows.length > 1) return fail('preference_conflict', 'Duplicate notification preferences need administrator review.', id, 409);
      const now = new Date().toISOString();
      const payload = {
        user_id: user.id,
        event_key: EVENT_KEY,
        recipient_type: 'customer',
        channel,
        enabled: body.enabled,
        consent_granted: body.enabled,
        consent_version: body.enabled ? consentVersion : clean(rows[0]?.consent_version, 80),
        consent_source: 'customer_portal',
        updated_by: user.id,
        updated_at: now,
      };
      const record = rows[0] ? await db.NotificationPreference.update(rows[0].id, payload) : await db.NotificationPreference.create(payload);
      await db.AuditEvent.create({
        event_type: body.enabled ? 'feedback_notification_consent_granted' : 'feedback_notification_consent_withdrawn',
        customer_account_id: customer.id,
        actor_id: user.id,
        actor_name: clean(user.full_name, 160) || 'Customer',
        actor_role: 'customer',
        outcome: 'succeeded',
        summary: `${channel.toUpperCase()} feedback invitation preference ${body.enabled ? 'enabled' : 'disabled'}`,
        visibility: 'system',
        metadata: { channel, consent_version: payload.consent_version, consent_source: payload.consent_source },
      }).catch(() => null);
      return ok({ channel, enabled: record.enabled === true && record.consent_granted === true, updated_at: record.updated_at }, id);
    }

    return fail('unknown_action', 'That preference action is not supported.', id, 400);
  } catch (error) {
    console.error('[notificationPreferenceActions]', JSON.stringify({ request_id: id, code: 'preference_action_failed', message: clean(error?.message || error, 500) }));
    return fail('internal_error', 'Notification preferences could not be updated.', id, 500);
  }
});
