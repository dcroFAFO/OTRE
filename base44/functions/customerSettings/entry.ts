import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Customer self-service settings API. Every action is scoped to the
// logged-in customer's own records — customers can never touch other
// customers' data. This function sends NO notifications.

const STAFF_ROLES = new Set(['admin', 'employee', 'technician', 'staff']);
const PLATFORMS = new Set(['facebook', 'instagram', 'tiktok', 'youtube', 'x_twitter', 'linkedin', 'website']);
const E164_PATTERN = /^\+614\d{8}$/;

function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
function cleanText(value) { return String(value || '').trim().toLowerCase(); }

function normalizePhone(value) {
  let cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('61')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return `+61${cleaned.replace(/\D/g, '')}`;
}

function generateReferralCode(seed) {
  const base = String(seed || Math.random()).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'ABCD';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OTR-${base}${rand}`.slice(0, 14);
}

function scooterMatches(a, b) {
  const aSerial = cleanText(a.serial_number);
  const bSerial = cleanText(b.serial_number);
  if (aSerial && bSerial && aSerial === bSerial) return true;
  return !!cleanText(a.model) && cleanText(a.make) === cleanText(b.make) && cleanText(a.model) === cleanText(b.model);
}

async function resolveContext(db, user) {
  const email = normalizeEmail(user.email);
  let profiles = await db.CustomerProfile.filter({ auth_user_id: user.id }, '-updated_date', 1).catch(() => []);
  if (profiles.length === 0 && email) profiles = await db.CustomerProfile.filter({ email }, '-updated_date', 1).catch(() => []);
  const profile = profiles[0] || null;
  let customers = user.customer_account_id ? [await db.Customer.get(user.customer_account_id).catch(() => null)].filter(Boolean) : [];
  if (customers.length === 0 && email) customers = await db.Customer.filter({ email }, '-updated_date', 1).catch(() => []);
  const customer = customers[0] || null;
  const stableId = customer?.customer_id || profile?.id || '';
  return { profile, customer, stableId, email };
}

async function listScooters(db, ctx) {
  const [byStable, byAccount] = await Promise.all([
    ctx.stableId ? db.Scooter.filter({ customer_id: ctx.stableId }, '-updated_date', 100).catch(() => []) : [],
    ctx.customer?.id ? db.Scooter.filter({ customer_account_id: ctx.customer.id }, '-updated_date', 100).catch(() => []) : [],
  ]);
  return [...new Map([...byStable, ...byAccount].map((s) => [s.id, s])).values()].map((s) => ({
    id: s.id, make: s.make || '', model: s.model || '', serial_number: s.serial_number || '',
    colour: s.colour || s.color || '', notes: s.notes || '',
    has_jobs: String(s.job_id || '').split(',').filter(Boolean).length > 0,
  }));
}

async function listConnections(db, ctx, userId) {
  const rows = await db.SocialConnection.filter({ auth_user_id: userId }, '-updated_date', 50).catch(() => []);
  return rows.map((c) => ({ id: c.id, platform: c.platform, handle: c.handle || '', profile_url: c.profile_url || '', status: c.status || 'manual' }));
}

function ownsScooter(scooter, ctx) {
  return (ctx.stableId && scooter.customer_id === ctx.stableId) || (ctx.customer?.id && scooter.customer_account_id === ctx.customer.id);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (STAFF_ROLES.has(String(user.role || '').toLowerCase())) return Response.json({ error: 'Settings is for customer accounts. Staff manage customers from the dashboard.' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const ctx = await resolveContext(db, user);
    const now = new Date().toISOString();

    if (body.action === 'get') {
      const [scooters, connections] = await Promise.all([listScooters(db, ctx), listConnections(db, ctx, user.id)]);

      // Lazily assign a referral code the first time a customer with an
      // account record loads their settings. No emails/SMS are sent here —
      // this only persists the code so it can be shared/displayed.
      let referral = {
        referral_code: ctx.customer?.referral_code || '',
        referral_status: ctx.customer?.referral_status || 'none',
        referral_eligible: !!ctx.customer?.referral_eligible,
      };
      if (ctx.customer && !referral.referral_code) {
        const code = generateReferralCode(ctx.customer.id);
        await db.Customer.update(ctx.customer.id, { referral_code: code }).catch(() => null);
        referral = { ...referral, referral_code: code };
      }

      return Response.json({
        profile: {
          name: ctx.profile?.display_name || ctx.profile?.full_name || ctx.customer?.full_name || user.full_name || '',
          email: ctx.email,
          phone_e164: ctx.profile?.phone_e164 || ctx.customer?.phone_e164 || '',
          can_edit_email: false,
        },
        scooters,
        connections,
        referral,
      });
    }

    if (body.action === 'updateProfile') {
      const name = String(body.name || '').trim();
      if (!name) return Response.json({ error: 'Please enter your name.' }, { status: 400 });
      let phone = '';
      if (String(body.phone || '').trim()) {
        phone = normalizePhone(body.phone);
        if (!E164_PATTERN.test(phone)) return Response.json({ error: 'Enter a valid Australian mobile number, e.g. 0412 345 678.' }, { status: 400 });
      }

      if (ctx.profile) {
        await db.CustomerProfile.update(ctx.profile.id, { display_name: name, name, full_name: name, ...(phone ? { phone_e164: phone } : {}), updated_at: now });
      } else {
        const created = await db.CustomerProfile.create({ display_name: name, name, full_name: name, email: ctx.email, phone_e164: phone, auth_user_id: user.id, email_verified: true, created_at: now, updated_at: now });
        ctx.profile = created;
        ctx.stableId = ctx.stableId || created.id;
      }
      if (ctx.customer) {
        await db.Customer.update(ctx.customer.id, { name, full_name: name, ...(phone ? { phone, phone_e164: phone, phone_display: phone } : {}), last_activity_date: now });
      }
      const accountEvents = ['account.profile_updated'];
      const previousPhone = ctx.profile?.phone_e164 || ctx.customer?.phone_e164 || '';
      if (phone && previousPhone && phone !== previousPhone) accountEvents.push('account.phone_changed');
      await db.NotificationEvent.bulkCreate(accountEvents.map((eventKey) => ({
        event_key: eventKey, related_entity_type: 'CustomerProfile', related_entity_id: ctx.profile?.id || ctx.customer?.id || user.id,
        customer_id: ctx.customer?.id || ctx.stableId || '', recipient_user_id: user.id, event_version: `${eventKey}:${now}`,
        event_data: { customer_name: name, customer_email: ctx.email, customer_phone: phone || previousPhone, message: eventKey === 'account.phone_changed' ? 'Your account phone number was changed.' : 'Your customer profile was updated.' },
        source: 'automatic', status: 'pending', occurred_at: now,
      })));

      // Keep the customer's own jobs displaying current details for staff
      // lists — links (ids) are never touched, so history stays intact.
      const jobs = await db.Job.filter({ customer_user_id: user.id }, '-created_date', 200).catch(() => []);
      if (jobs.length > 0) {
        await db.Job.bulkUpdate(jobs.map((j) => ({
          id: j.id, customer_name: name,
          ...(phone ? { customer_phone: phone, customer_phone_e164: phone, customer_phone_display: phone } : {}),
        })));
      }
      return Response.json({ saved: true });
    }

    if (body.action === 'saveScooter') {
      const data = {
        make: String(body.data?.make || '').trim(),
        model: String(body.data?.model || '').trim(),
        serial_number: String(body.data?.serial_number || '').trim(),
        colour: String(body.data?.colour || '').trim(),
        color: String(body.data?.colour || '').trim(),
        notes: String(body.data?.notes || '').trim(),
      };
      if (!data.model && !data.make) return Response.json({ error: 'Please enter your scooter make and model.' }, { status: 400 });
      if (!ctx.customer && !ctx.profile) {
        const created = await db.CustomerProfile.create({ display_name: user.full_name || ctx.email, name: user.full_name || ctx.email, email: ctx.email, auth_user_id: user.id, created_at: now, updated_at: now });
        ctx.profile = created;
        ctx.stableId = created.id;
      }
      const ownerFields = { customer_id: ctx.stableId, customer_account_id: ctx.customer?.id || '' };

      if (body.scooter_id) {
        const scooter = await db.Scooter.get(body.scooter_id).catch(() => null);
        if (!scooter || !ownsScooter(scooter, ctx)) return Response.json({ error: 'Scooter not found.' }, { status: 404 });
        const updated = await db.Scooter.update(scooter.id, { ...data, ...ownerFields });
        await db.NotificationEvent.create({ event_key: 'account.asset_updated', related_entity_type: 'Scooter', related_entity_id: updated.id, customer_id: ctx.customer?.id || ctx.stableId || '', recipient_user_id: user.id, event_version: updated.updated_date || now, event_data: { customer_name: user.full_name, customer_email: ctx.email, customer_phone: ctx.profile?.phone_e164 || '', message: 'Your saved scooter details were updated.' }, source: 'automatic', status: 'pending', occurred_at: now });
        return Response.json({ saved: true, scooter_id: updated.id });
      }

      const existing = await listScooters(db, ctx);
      if (existing.some((s) => scooterMatches(s, data))) return Response.json({ error: 'You already have this scooter saved.' }, { status: 400 });
      const created = await db.Scooter.create({ ...data, ...ownerFields });
      await db.NotificationEvent.create({ event_key: 'account.asset_added', related_entity_type: 'Scooter', related_entity_id: created.id, customer_id: ctx.customer?.id || ctx.stableId || '', recipient_user_id: user.id, event_version: created.created_date || now, event_data: { customer_name: user.full_name, customer_email: ctx.email, customer_phone: ctx.profile?.phone_e164 || '', message: 'A scooter was added to your account.' }, source: 'automatic', status: 'pending', occurred_at: now });
      return Response.json({ saved: true, scooter_id: created.id });
    }

    if (body.action === 'deleteScooter') {
      const scooter = await db.Scooter.get(body.scooter_id).catch(() => null);
      if (!scooter || !ownsScooter(scooter, ctx)) return Response.json({ error: 'Scooter not found.' }, { status: 404 });
      if (String(scooter.job_id || '').split(',').filter(Boolean).length > 0) {
        return Response.json({ error: 'This scooter is linked to past repair jobs, so it is kept for your service history and can\'t be removed.' }, { status: 400 });
      }
      await db.Scooter.delete(scooter.id);
      return Response.json({ deleted: true });
    }

    if (body.action === 'saveConnection') {
      const platform = String(body.platform || '').toLowerCase();
      if (!PLATFORMS.has(platform)) return Response.json({ error: 'Unknown platform.' }, { status: 400 });
      const handle = String(body.handle || '').trim().slice(0, 120);
      let profileUrl = String(body.profile_url || '').trim().slice(0, 500);
      if (profileUrl && !/^https?:\/\//i.test(profileUrl)) profileUrl = `https://${profileUrl}`;
      if (!handle && !profileUrl) return Response.json({ error: 'Add a handle or profile link.' }, { status: 400 });

      const existing = await db.SocialConnection.filter({ auth_user_id: user.id, platform }, '-updated_date', 1).catch(() => []);
      if (existing[0]) {
        await db.SocialConnection.update(existing[0].id, { handle, profile_url: profileUrl, status: 'manual', updated_at: now });
        return Response.json({ saved: true, connection_id: existing[0].id });
      }
      const created = await db.SocialConnection.create({ customer_id: ctx.stableId, customer_account_id: ctx.customer?.id || '', auth_user_id: user.id, platform, handle, profile_url: profileUrl, status: 'manual', created_at: now, updated_at: now });
      return Response.json({ saved: true, connection_id: created.id });
    }

    if (body.action === 'deleteConnection') {
      const row = await db.SocialConnection.get(body.connection_id).catch(() => null);
      if (!row || row.auth_user_id !== user.id) return Response.json({ error: 'Connection not found.' }, { status: 404 });
      await db.SocialConnection.delete(row.id);
      return Response.json({ deleted: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[customerSettings] failed:', error.message, error.stack);
    return Response.json({ error: 'Sorry — we couldn\'t save your changes just now. Please try again.' }, { status: 500 });
  }
});