import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

// Customer self-service settings API. Every action is scoped to the
// logged-in customer's own records — customers can never touch other
// customers' data. This function sends NO notifications.

const PLATFORMS = new Set([
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "x_twitter",
  "linkedin",
  "website",
]);
const VERIFIABLE_HOSTS = {
  facebook: ["facebook.com"],
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com"],
  x_twitter: ["x.com", "twitter.com"],
  linkedin: ["linkedin.com"],
};
const VERIFY_WINDOW_MS = 24 * 60 * 60 * 1000;
const VERIFY_COOLDOWN_MS = 60 * 1000;
const VERIFY_LIMIT = 5;
const MAX_PROFILE_BYTES = 1024 * 1024;
const E164_PATTERN = /^\+614\d{8}$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
function cleanText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  let cleaned = String(value || "").trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+61")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("61")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  return `+61${cleaned.replace(/\D/g, "")}`;
}

class IdentityConflictError extends Error {
  code: string;

  constructor(message: string, code = "IDENTITY_CONFLICT") {
    super(message);
    this.name = "IdentityConflictError";
    this.code = code;
  }
}

async function findCanonicalCustomer(db, userId) {
  if (!userId) return null;
  const customers = await db.Customer.filter(
    { user_id: userId },
    "-updated_date",
    3,
  );
  if (customers.length > 1) {
    throw new IdentityConflictError(
      "More than one Customer is linked to this user.",
      "DUPLICATE_CUSTOMER_USER_ID",
    );
  }

  const customer = customers[0] || null;
  const links = await db.CustomerIdentityLink.filter(
    { user_id: userId },
    "-linked_at",
    3,
  );
  const active = links.filter((link) => link.status === "active");
  if (active.length > 1) {
    throw new IdentityConflictError(
      "More than one active identity link exists.",
      "DUPLICATE_IDENTITY_LINK",
    );
  }
  if (active[0] && customer && active[0].customer_account_id !== customer.id) {
    throw new IdentityConflictError(
      "Customer and identity link ownership disagree.",
      "IDENTITY_LINK_MISMATCH",
    );
  }
  if (active[0] && !customer) {
    throw new IdentityConflictError(
      "Identity link references a Customer that is not linked by user_id.",
      "ORPHAN_IDENTITY_LINK",
    );
  }
  return customer;
}

async function ensureIdentityLink(db, userId, customerId, source, now) {
  const [byUser, byCustomer] = await Promise.all([
    db.CustomerIdentityLink.filter({ user_id: userId }, "-linked_at", 3),
    db.CustomerIdentityLink.filter(
      { customer_account_id: customerId },
      "-linked_at",
      3,
    ),
  ]);
  const userLink = byUser.find((link) => link.status === "active");
  const customerLink = byCustomer.find((link) => link.status === "active");
  if (userLink && userLink.customer_account_id !== customerId) {
    throw new IdentityConflictError(
      "User already owns another Customer.",
      "USER_ALREADY_LINKED",
    );
  }
  if (customerLink && customerLink.user_id !== userId) {
    throw new IdentityConflictError(
      "Customer is already owned by another User.",
      "CUSTOMER_ALREADY_LINKED",
    );
  }
  if (userLink) return userLink;

  const pending = byUser.find((link) => link.status === "pending");
  if (pending) {
    try {
      return await db.CustomerIdentityLink.update(pending.id, {
        customer_account_id: customerId,
        status: "active",
        source,
        linked_at: now,
      });
    } catch (error) {
      const retry = await db.CustomerIdentityLink.filter(
        { user_id: userId },
        "-linked_at",
        3,
      );
      const active = retry.find((link) =>
        link.status === "active" && link.customer_account_id === customerId
      );
      if (active) return active;
      throw error;
    }
  }
  if (byUser.some((link) => link.status === "revoked")) {
    throw new IdentityConflictError(
      "This identity link was revoked and requires admin review.",
      "IDENTITY_LINK_REVOKED",
    );
  }

  try {
    return await db.CustomerIdentityLink.create({
      user_id: userId,
      customer_account_id: customerId,
      status: "active",
      source,
      linked_at: now,
    });
  } catch (error) {
    const retry = await db.CustomerIdentityLink.filter(
      { user_id: userId },
      "-linked_at",
      3,
    );
    const existing = retry.find((link) =>
      link.status === "active" && link.customer_account_id === customerId
    );
    if (existing) return existing;
    throw error;
  }
}

async function ensureCanonicalCustomer(
  db,
  user,
  source = "authenticated_signup",
) {
  let customer = await findCanonicalCustomer(db, user.id);
  const now = new Date().toISOString();
  if (!customer) {
    const completedPhoneUses = await db.PhoneVerificationUse.filter(
      { user_id: user.id, status: "completed" },
      "-completed_at",
      2,
    ).catch(() => []);
    if (!completedPhoneUses[0]) {
      throw new IdentityConflictError(
        "Verify your mobile number before creating a customer account.",
        "PHONE_VERIFICATION_REQUIRED",
      );
    }
    let reservation;
    try {
      reservation = await db.CustomerIdentityLink.create({
        user_id: user.id,
        customer_account_id: `pending:${user.id}`,
        status: "pending",
        source,
        linked_at: now,
      });
    } catch {
      const links = await db.CustomerIdentityLink.filter(
        { user_id: user.id },
        "-linked_at",
        3,
      );
      const active = links.find((link) => link.status === "active");
      if (active) {
        const linkedCustomer = await db.Customer.get(active.customer_account_id)
          .catch(() => null);
        if (linkedCustomer?.user_id === user.id) return linkedCustomer;
      }
      throw new IdentityConflictError(
        "Customer account bootstrap is already in progress or requires review.",
        "IDENTITY_BOOTSTRAP_IN_PROGRESS",
      );
    }

    const customerId = `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const name = String(user.full_name || user.email || "Customer").trim();
    const email = normalizeEmail(user.email);
    const normalizedPhone = normalizePhone(user.phone);
    const phone = E164_PATTERN.test(normalizedPhone) ? normalizedPhone : "";
    try {
      customer = await db.Customer.create({
        customer_id: customerId,
        user_id: user.id,
        name,
        full_name: name,
        email,
        phone,
        phone_e164: phone,
        phone_display: phone,
        status: "active",
        tags: ["customer"],
        identity_version: 2,
        identity_linked_at: now,
        identity_link_source: source,
        createdAt: now,
        last_activity_date: now,
      });
      await db.CustomerIdentityLink.update(reservation.id, {
        customer_account_id: customer.id,
        status: "active",
        source,
        linked_at: now,
      });
    } catch (error) {
      customer = await findCanonicalCustomer(db, user.id);
      if (!customer) {
        await db.CustomerIdentityLink.delete(reservation.id).catch(() => null);
        throw error;
      }
    }
  }

  await ensureIdentityLink(db, user.id, customer.id, source, now);
  return customer;
}

function generateReferralCode(seed) {
  const base =
    String(seed || Math.random()).replace(/[^a-zA-Z0-9]/g, "").slice(-4)
      .toUpperCase() || "ABCD";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OTR-${base}${rand}`.slice(0, 14);
}

function generateVerificationCode() {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes).map((byte) => byte.toString(36).toUpperCase())
    .join("").slice(0, 8);
  return `OTR-VERIFY-${token}`;
}

function normalizeProfileUrl(value, platform) {
  const raw = String(value || "").trim().slice(0, 500);
  if (!raw) return { error: "Add the public profile link you want to verify." };
  let parsed;
  try {
    parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return { error: "Enter a valid public profile link." };
  }
  if (
    parsed.protocol !== "https:" || parsed.username || parsed.password ||
    (parsed.port && parsed.port !== "443")
  ) {
    return { error: "Use a secure public HTTPS profile link." };
  }
  const hosts = VERIFIABLE_HOSTS[platform];
  if (!hosts) {
    return { error: "This profile type cannot be automatically verified." };
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (
    !hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  ) {
    return {
      error: `Use the official ${
        platform === "x_twitter" ? "X or Twitter" : platform
      } profile address.`,
    };
  }
  parsed.hash = "";
  return { url: parsed.toString(), host };
}

async function readLimitedText(response) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_PROFILE_BYTES) throw new Error("profile_too_large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PROFILE_BYTES) {
      await reader.cancel();
      throw new Error("profile_too_large");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function fetchVerifiedProfile(profileUrl, platform) {
  let current = profileUrl;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const normalized = normalizeProfileUrl(current, platform);
    if (normalized.error) return { blocked: true };
    let response;
    try {
      response = await fetch(normalized.url, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "OTRE-Profile-Verification/1.0",
          Accept: "text/html,text/plain",
        },
      });
    } catch {
      return { blocked: true };
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return { blocked: true };
      current = new URL(location, normalized.url).toString();
      continue;
    }
    if (!response.ok) return { blocked: true };
    const contentType = String(response.headers.get("content-type") || "")
      .toLowerCase();
    if (
      !contentType.includes("text/html") && !contentType.includes("text/plain")
    ) return { blocked: true };
    try {
      return { text: await readLimitedText(response) };
    } catch {
      return { blocked: true };
    }
  }
  return { blocked: true };
}

function scooterMatches(a, b) {
  const aSerial = cleanText(a.serial_number);
  const bSerial = cleanText(b.serial_number);
  if (aSerial && bSerial && aSerial === bSerial) return true;
  return !!cleanText(a.model) && cleanText(a.make) === cleanText(b.make) &&
    cleanText(a.model) === cleanText(b.model);
}

async function resolveContext(db, user, customer) {
  const email = normalizeEmail(user.email);
  const profiles = customer
    ? await db.CustomerProfile.filter(
      { customer_account_id: customer.id },
      "-updated_date",
      1,
    ).catch(() => [])
    : [];
  const profile = profiles[0] || null;
  const stableId = customer?.customer_id || customer?.id || "";
  return { profile, customer, stableId, email };
}

async function hasLinkedJobs(db, scooter) {
  if (String(scooter.job_id || "").split(",").some((id) => id.trim())) {
    return true;
  }
  if (!scooter.id) return true;
  try {
    const jobs = await db.Job.filter(
      { asset_id: scooter.id },
      "-created_date",
      1,
    );
    return jobs.length > 0;
  } catch (error) {
    // Fail closed: an unavailable linkage check must never permit hard delete.
    console.warn(
      "[customerSettings] scooter linkage check failed",
      error instanceof Error ? error.message : String(error),
    );
    return true;
  }
}

async function listScooters(db, ctx) {
  const rows = ctx.customer?.id
    ? await db.Scooter.filter(
      { customer_account_id: ctx.customer.id },
      "-updated_date",
      100,
    ).catch(() => [])
    : [];
  return await Promise.all(rows.filter((s) => !s.archived_at).map(async (s) => ({
    id: s.id,
    make: s.make || "",
    model: s.model || "",
    serial_number: s.serial_number || "",
    colour: s.colour || s.color || "",
    notes: s.notes || "",
    has_jobs: await hasLinkedJobs(db, s),
  })));
}

async function listConnections(db, userId) {
  const rows = await db.SocialConnection.filter(
    { auth_user_id: userId },
    "-updated_date",
    50,
  ).catch(() => []);
  return rows.map((c) => ({
    id: c.id,
    platform: c.platform,
    handle: c.handle || "",
    profile_url: c.profile_url || "",
    status: c.status === "verified" ? "verified" : "unverified",
    verification_code: c.verification_code || "",
    verification_result: c.verification_result || "not_checked",
    verification_checked_at: c.verification_checked_at || "",
  }));
}

function ownsScooter(scooter, ctx) {
  return !!ctx.customer?.id && scooter.customer_account_id === ctx.customer.id;
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
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "customer") {
      return Response.json({
        error:
          "Settings is for customer accounts. Admins manage customers from the dashboard.",
      }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const canonical = await ensureCanonicalCustomer(
      db,
      user,
      "authenticated_signup",
    );
    const ctx = await resolveContext(db, user, canonical);
    const now = new Date().toISOString();

    if (body.action === "get") {
      const [scooters, connections] = await Promise.all([
        listScooters(db, ctx),
        listConnections(db, user.id),
      ]);

      // Lazily assign a referral code the first time a customer with an
      // account record loads their settings. No emails/SMS are sent here —
      // this only persists the code so it can be shared/displayed.
      let referral = {
        referral_code: ctx.customer?.referral_code || "",
        referral_status: ctx.customer?.referral_status || "none",
        referral_eligible: !!ctx.customer?.referral_eligible,
      };
      if (ctx.customer && !referral.referral_code) {
        const code = generateReferralCode(ctx.customer.id);
        await db.Customer.update(ctx.customer.id, { referral_code: code })
          .catch(() => null);
        referral = { ...referral, referral_code: code };
      }

      return Response.json({
        profile: {
          name: ctx.profile?.display_name || ctx.profile?.full_name ||
            ctx.customer?.full_name || user.full_name || "",
          email: ctx.email,
          phone_e164: ctx.profile?.phone_e164 || ctx.customer?.phone_e164 || "",
          can_edit_email: false,
        },
        scooters,
        connections,
        referral,
      });
    }

    if (body.action === "updateProfile") {
      const name = String(body.name || "").trim();
      if (!name) {
        return Response.json({ error: "Please enter your name." }, {
          status: 400,
        });
      }
      let phone = "";
      if (String(body.phone || "").trim()) {
        phone = normalizePhone(body.phone);
        if (!E164_PATTERN.test(phone)) {
          return Response.json({
            error: "Enter a valid Australian mobile number, e.g. 0412 345 678.",
          }, { status: 400 });
        }
      }

      if (ctx.profile) {
        await db.CustomerProfile.update(ctx.profile.id, {
          display_name: name,
          name,
          full_name: name,
          ...(phone ? { phone_e164: phone } : {}),
          updated_at: now,
        });
      } else {
        const created = await db.CustomerProfile.create({
          display_name: name,
          name,
          full_name: name,
          email: ctx.email,
          phone_e164: phone,
          customer_account_id: ctx.customer.id,
          auth_user_id: user.id,
          email_verified: true,
          created_at: now,
          updated_at: now,
        });
        ctx.profile = created;
        ctx.stableId = ctx.stableId || created.id;
      }
      if (ctx.customer) {
        await db.Customer.update(ctx.customer.id, {
          name,
          full_name: name,
          ...(phone ? { phone, phone_e164: phone, phone_display: phone } : {}),
          last_activity_date: now,
        });
      }
      // Keep the customer's own jobs displaying current details for staff
      // lists — links (ids) are never touched, so history stays intact.
      const jobs = await db.Job.filter(
        { customer_account_id: ctx.customer.id },
        "-created_date",
        200,
      ).catch(() => []);
      if (jobs.length > 0) {
        await db.Job.bulkUpdate(jobs.map((j) => ({
          id: j.id,
          customer_name: name,
          ...(phone
            ? {
              customer_phone: phone,
              customer_phone_e164: phone,
              customer_phone_display: phone,
            }
            : {}),
        })));
      }
      return Response.json({ saved: true });
    }

    if (body.action === "saveScooter") {
      const data = {
        make: String(body.data?.make || "").trim(),
        model: String(body.data?.model || "").trim(),
        serial_number: String(body.data?.serial_number || "").trim(),
        colour: String(body.data?.colour || "").trim(),
        color: String(body.data?.colour || "").trim(),
        notes: String(body.data?.notes || "").trim(),
      };
      if (!data.model && !data.make) {
        return Response.json({
          error: "Please enter your scooter make and model.",
        }, { status: 400 });
      }
      if (!ctx.profile) {
        const created = await db.CustomerProfile.create({
          display_name: user.full_name || ctx.email,
          name: user.full_name || ctx.email,
          email: ctx.email,
          customer_account_id: ctx.customer.id,
          auth_user_id: user.id,
          created_at: now,
          updated_at: now,
        });
        ctx.profile = created;
      }
      const ownerFields = {
        customer_id: ctx.stableId,
        customer_account_id: ctx.customer?.id || "",
      };

      if (body.scooter_id) {
        const scooter = await db.Scooter.get(body.scooter_id).catch(() => null);
        if (!scooter || !ownsScooter(scooter, ctx)) {
          return Response.json({ error: "Scooter not found." }, {
            status: 404,
          });
        }
        const updated = await db.Scooter.update(scooter.id, {
          ...data,
          ...ownerFields,
        });
        return Response.json({ saved: true, scooter_id: updated.id });
      }

      const existing = await listScooters(db, ctx);
      if (existing.some((s) => scooterMatches(s, data))) {
        return Response.json(
          { error: "You already have this scooter saved." },
          { status: 400 },
        );
      }
      const created = await db.Scooter.create({ ...data, ...ownerFields });
      return Response.json({ saved: true, scooter_id: created.id });
    }

    if (body.action === "deleteScooter") {
      const scooter = await db.Scooter.get(body.scooter_id).catch(() => null);
      if (!scooter || !ownsScooter(scooter, ctx)) {
        return Response.json({ error: "Scooter not found." }, { status: 404 });
      }
      if (await hasLinkedJobs(db, scooter)) {
        return Response.json({
          error:
            "This scooter is linked to past repair jobs, so it is kept for your service history and can't be removed.",
        }, { status: 400 });
      }
      await db.Scooter.delete(scooter.id);
      return Response.json({ deleted: true });
    }

    if (body.action === "archiveScooter") {
      const scooter = await db.Scooter.get(body.scooter_id).catch(() => null);
      if (!scooter || !ownsScooter(scooter, ctx) || scooter.archived_at) {
        return Response.json({ error: "Scooter not found." }, { status: 404 });
      }
      const hasJobs = await hasLinkedJobs(db, scooter);
      if (!hasJobs) {
        return Response.json({
          error: "Unlinked scooters can be removed instead of archived.",
        }, { status: 409 });
      }
      await db.Scooter.update(scooter.id, {
        archived_at: now,
        archived_by_user_id: user.id,
        archive_reason: "Archived by customer; service history retained.",
      });
      return Response.json({ archived: true });
    }

    if (body.action === "saveConnection") {
      const platform = String(body.platform || "").toLowerCase();
      if (!PLATFORMS.has(platform)) {
        return Response.json({ error: "Unknown platform." }, { status: 400 });
      }
      const handle = String(body.handle || "").trim().slice(0, 120);
      const normalized = normalizeProfileUrl(body.profile_url, platform);
      if (normalized.error) {
        return Response.json({ error: normalized.error }, { status: 400 });
      }
      const profileUrl = normalized.url;

      const existing = await db.SocialConnection.filter(
        { auth_user_id: user.id, platform },
        "-updated_date",
        1,
      ).catch(() => []);
      if (existing[0]) {
        const urlChanged = existing[0].profile_url !== profileUrl;
        await db.SocialConnection.update(existing[0].id, {
          handle,
          profile_url: profileUrl,
          status: urlChanged
            ? "unverified"
            : (existing[0].status === "verified" ? "verified" : "unverified"),
          verification_code: urlChanged
            ? generateVerificationCode()
            : (existing[0].verification_code || generateVerificationCode()),
          verification_result: urlChanged
            ? "not_checked"
            : (existing[0].verification_result || "not_checked"),
          verification_attempt_count: urlChanged
            ? 0
            : Number(existing[0].verification_attempt_count || 0),
          verification_window_started_at: urlChanged
            ? now
            : (existing[0].verification_window_started_at || now),
          updated_at: now,
        });
        return Response.json({ saved: true, connection_id: existing[0].id });
      }
      const created = await db.SocialConnection.create({
        customer_id: ctx.stableId,
        customer_account_id: ctx.customer?.id || "",
        auth_user_id: user.id,
        platform,
        handle,
        profile_url: profileUrl,
        status: "unverified",
        verification_code: generateVerificationCode(),
        verification_result: "not_checked",
        verification_attempt_count: 0,
        verification_window_started_at: now,
        created_at: now,
        updated_at: now,
      });
      return Response.json({ saved: true, connection_id: created.id });
    }

    if (body.action === "verifyConnection") {
      const row = await db.SocialConnection.get(body.connection_id).catch(() =>
        null
      );
      if (!row || row.auth_user_id !== user.id) {
        return Response.json({ error: "Profile not found." }, { status: 404 });
      }
      if (row.status === "verified") {
        return Response.json({ verified: true, status: "verified" });
      }
      const normalized = normalizeProfileUrl(row.profile_url, row.platform);
      if (normalized.error) {
        return Response.json({ error: normalized.error }, { status: 400 });
      }
      const windowStarted = new Date(row.verification_window_started_at || 0)
        .getTime();
      const inWindow = windowStarted &&
        Date.now() - windowStarted < VERIFY_WINDOW_MS;
      const attempts = inWindow
        ? Number(row.verification_attempt_count || 0)
        : 0;
      const lastAttempt = new Date(row.last_verification_attempt_at || 0)
        .getTime();
      if (lastAttempt && Date.now() - lastAttempt < VERIFY_COOLDOWN_MS) {
        return Response.json({
          error: "Please wait a minute before checking this profile again.",
        }, { status: 429 });
      }
      if (attempts >= VERIFY_LIMIT) {
        await db.SocialConnection.update(row.id, {
          verification_result: "rate_limited",
        }).catch(() => null);
        return Response.json({
          error: "Verification limit reached. Try again tomorrow.",
        }, { status: 429 });
      }
      const attemptAt = new Date().toISOString();
      await db.SocialConnection.update(row.id, {
        verification_attempt_count: attempts + 1,
        verification_window_started_at: inWindow
          ? row.verification_window_started_at
          : attemptAt,
        last_verification_attempt_at: attemptAt,
      });
      const result = await fetchVerifiedProfile(normalized.url, row.platform);
      if (result.blocked) {
        await db.SocialConnection.update(row.id, {
          status: "unverified",
          verification_result: "blocked",
          verification_checked_at: attemptAt,
        });
        return Response.json({
          verified: false,
          blocked: true,
          status: "unverified",
          message:
            "This public profile could not be checked automatically. It remains unverified.",
        });
      }
      const verified = String(result.text || "").toUpperCase().includes(
        String(row.verification_code || "").toUpperCase(),
      );
      await db.SocialConnection.update(row.id, {
        status: verified ? "verified" : "unverified",
        verification_result: verified ? "verified" : "code_not_found",
        verification_checked_at: attemptAt,
        updated_at: attemptAt,
      });
      return Response.json({
        verified,
        status: verified ? "verified" : "unverified",
        message: verified
          ? "Profile verified."
          : "Verification code not found on the public profile yet.",
      });
    }

    if (body.action === "deleteConnection") {
      const row = await db.SocialConnection.get(body.connection_id).catch(() =>
        null
      );
      if (!row || row.auth_user_id !== user.id) {
        return Response.json({ error: "Connection not found." }, {
          status: 404,
        });
      }
      await db.SocialConnection.delete(row.id);
      return Response.json({ deleted: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[customerSettings] failed:", message, stack);
    if (error instanceof IdentityConflictError) {
      if (error.code === "PHONE_VERIFICATION_REQUIRED") {
        return Response.json({
          error: "Verify your mobile number before creating a customer account.",
          code: error.code,
        }, { status: 403 });
      }
      return Response.json({
        error: "Customer account ownership needs administrator review.",
        code: error.code,
      }, { status: 409 });
    }
    return Response.json({
      error:
        "Sorry — we couldn't save your changes just now. Please try again.",
    }, { status: 500 });
  }
});
