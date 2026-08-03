// Abuse controls for unauthenticated endpoints.
//
// createBooking is a public, service-role endpoint that writes 7 entities and sends
// metered SMS + email per call. Without a throttle, an anonymous loop is a direct
// financial denial-of-service. These helpers provide a fixed-window counter backed
// by the RateLimit entity, plus a duplicate-submission guard.
//
// LIMITATION: the counter is read-modify-write, so it is not perfectly atomic under
// heavy concurrency. It reliably stops sequential/scripted abuse, which is the
// realistic threat here; it is not a substitute for edge rate limiting.

const WINDOW_SECONDS = 600; // 10 minutes

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function windowStart(now: number): string {
  const bucket = Math.floor(now / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS * 1000;
  return new Date(bucket).toISOString();
}

/**
 * Increments the counter for `key` in the current window.
 * Returns { allowed, count } — allowed is false once `limit` is exceeded.
 */
export async function checkRateLimit(base44: any, key: string, limit: number): Promise<{ allowed: boolean; count: number }> {
  const entities = base44.asServiceRole.entities;
  const now = Date.now();
  const window_start = windowStart(now);

  const existing = await entities.RateLimit.filter({ scope_key: key, window_start }, '-created_date', 1);
  const record = existing[0] || null;

  if (!record) {
    await entities.RateLimit.create({ scope_key: key, window_start, count: 1, last_seen_at: new Date(now).toISOString() });
    return { allowed: true, count: 1 };
  }

  const count = (Number(record.count) || 0) + 1;
  await entities.RateLimit.update(record.id, { count, last_seen_at: new Date(now).toISOString() });
  return { allowed: count <= limit, count };
}

/**
 * Duplicate-submission guard: returns the existing Job when the same email has
 * already submitted the same issue text inside the window. Stops double-clicks and
 * replayed payloads from creating duplicate jobs, customers and notifications.
 */
export async function findRecentDuplicateJob(base44: any, email: string, issueDescription: string) {
  if (!email) return null;
  const cutoff = Date.now() - WINDOW_SECONDS * 1000;
  const recent = await base44.asServiceRole.entities.Job.filter({ customer_email: email }, '-created_date', 5);
  const issue = String(issueDescription || '').trim().toLowerCase();
  return recent.find((job: any) => {
    const created = new Date(job.created_date || job.createdAt || 0).getTime();
    if (created < cutoff) return false;
    return String(job.issue_description || '').trim().toLowerCase() === issue;
  }) || null;
}