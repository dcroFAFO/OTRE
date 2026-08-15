// Abuse controls for unauthenticated endpoints.
//
// Enforcement is backed by one unique RateLimitHit row per allowed sequence in
// a fixed window. Base44 does not expose a portable conditional-update/CAS API,
// so uniqueness is the concurrency primitive: competing callers race for the
// same sequence and only the successful create owns that hit. RateLimit.count is
// observability only and MUST NOT be used for authorization.
//
// TRUST BOUNDARY: forwarding headers are accepted only when the server-only
// TRUST_PROXY_HEADERS flag is exactly "true". Enable it only after verifying the
// Base44 edge strips caller-supplied forwarding headers and injects its own. With
// the flag absent/false, all requests share one global circuit-breaker bucket.
// Callers MUST use clientIpThrottle() when the IP bucket is not also scoped by
// an authenticated user or contact so the shared fallback does not become a
// low-volume, site-wide denial of service.

const WINDOW_SECONDS = 600;
const MAX_LIMIT = 10_000;
const encoder = new TextEncoder();

function normalizeForwardedIp(value: string): string {
  let candidate = String(value || "").trim().toLowerCase();
  if (!candidate) return "";
  const bracketed = candidate.match(/^\[([0-9a-f:.]+)\](?::\d+)?$/);
  if (bracketed) {
    candidate = bracketed[1];
  } else {
    const ipv4WithPort = candidate.match(
      /^((?:\d{1,3}\.){3}\d{1,3}):\d+$/,
    );
    if (ipv4WithPort) candidate = ipv4WithPort[1];
  }
  const unwrapped = candidate;
  const ipv4 = unwrapped.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (
    ipv4 &&
    ipv4.slice(1).every((part) => Number(part) >= 0 && Number(part) <= 255)
  ) return unwrapped;
  if (unwrapped.includes(":") && /^[0-9a-f:.]{2,45}$/.test(unwrapped)) {
    try {
      const parsed = new URL(`http://[${unwrapped}]/`);
      return parsed.hostname.replace(/^\[|\]$/g, "");
    } catch {
      return "";
    }
  }
  return "";
}

export function clientIp(req: Request): string {
  if (Deno.env.get("TRUST_PROXY_HEADERS") !== "true") return "untrusted-proxy";
  const forwarded = req.headers.get("x-forwarded-for");
  const candidate = forwarded
    ? forwarded.split(",")[0]
    : req.headers.get("x-real-ip");
  return normalizeForwardedIp(candidate || "") || "invalid-proxy-address";
}

/**
 * Selects a normal per-IP limit only when the edge trust contract is enabled.
 * Otherwise every request shares a deliberately larger global circuit breaker;
 * contact/user limits remain the primary abuse control in that mode.
 */
export function clientIpThrottle(
  req: Request,
  trustedLimit: number,
  untrustedGlobalLimit: number,
): { key: string; limit: number; trusted: boolean } {
  const trusted = Deno.env.get("TRUST_PROXY_HEADERS") === "true";
  const limit = Math.trunc(Number(trusted ? trustedLimit : untrustedGlobalLimit));
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error("invalid_ip_rate_limit_configuration");
  }
  return { key: clientIp(req), limit, trusted };
}

function windowStart(now: number): string {
  const bucket = Math.floor(now / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS *
    1000;
  return new Date(bucket).toISOString();
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function findOrCreateBucket(
  entities: any,
  scopeKey: string,
  startedAt: string,
  bucketKey: string,
  now: string,
) {
  const existing = await entities.RateLimit.filter(
    { bucket_key: bucketKey },
    "-created_date",
    2,
  ).catch(() => []);
  if (existing[0]) return existing[0];
  try {
    return await entities.RateLimit.create({
      bucket_key: bucketKey,
      scope_key: scopeKey,
      window_start: startedAt,
      count: 0,
      last_seen_at: now,
    });
  } catch (error) {
    const raced = await entities.RateLimit.filter(
      { bucket_key: bucketKey },
      "-created_date",
      2,
    ).catch(() => []);
    if (raced[0]) return raced[0];
    throw error;
  }
}

/**
 * Atomically reserves one fixed-window hit using unique sequence records.
 * Throws when persistence is unavailable so public write/send paths fail closed.
 */
export async function checkRateLimit(
  base44: any,
  key: string,
  requestedLimit: number,
): Promise<{ allowed: boolean; count: number }> {
  const limit = Math.trunc(Number(requestedLimit));
  if (
    !String(key || "").trim() || !Number.isInteger(limit) || limit < 1 ||
    limit > MAX_LIMIT
  ) {
    throw new Error("invalid_rate_limit_configuration");
  }

  const entities = base44.asServiceRole.entities;
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const startedAt = windowStart(nowMs);
  const scopeKey = `sha256:${await sha256(String(key))}`;
  const bucketKey = `${scopeKey}:${startedAt}`;
  const bucket = await findOrCreateBucket(
    entities,
    scopeKey,
    startedAt,
    bucketKey,
    now,
  );

  for (let sequence = 1; sequence <= limit + 1; sequence += 1) {
    const hitKey = `${bucketKey}:${sequence}`;
    const existing = await entities.RateLimitHit.filter(
      { hit_key: hitKey },
      "-created_date",
      1,
    ).catch(() => []);
    if (existing[0]) continue;
    try {
      await entities.RateLimitHit.create({
        hit_key: hitKey,
        bucket_key: bucketKey,
        rate_limit_id: bucket.id,
        sequence,
        occurred_at: now,
      });
      await entities.RateLimit.update(bucket.id, {
        count: sequence,
        last_seen_at: now,
      }).catch(() => null);
      return { allowed: sequence <= limit, count: sequence };
    } catch (error) {
      const raced = await entities.RateLimitHit.filter(
        { hit_key: hitKey },
        "-created_date",
        1,
      ).catch(() => []);
      if (!raced[0]) throw error;
    }
  }

  return { allowed: false, count: limit + 1 };
}

/**
 * Duplicate-submission guard. Rate-limit hits are authoritative for throttling;
 * this lookup is only an idempotency convenience for repeated booking payloads.
 */
export async function findRecentDuplicateJob(
  base44: any,
  email: string,
  issueDescription: string,
) {
  if (!email) return null;
  const cutoff = Date.now() - WINDOW_SECONDS * 1000;
  const recent = await base44.asServiceRole.entities.Job.filter(
    { customer_email: email },
    "-created_date",
    5,
  );
  const issue = String(issueDescription || "").trim().toLowerCase();
  return recent.find((job: any) => {
    const created = new Date(job.created_date || job.createdAt || 0).getTime();
    if (created < cutoff) return false;
    return String(job.issue_description || "").trim().toLowerCase() === issue;
  }) || null;
}
