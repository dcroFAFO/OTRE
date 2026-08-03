// Trusted origin resolution shared by every function that builds a customer-facing
// link (notification emails/SMS, Stripe success/cancel URLs).
//
// Request headers (Origin / Referer) are attacker-controlled. A spoofed Origin on a
// Stripe checkout call would redirect the paying customer to an attacker domain with
// the tracking token in the path. So headers are only ever accepted when they match
// the allowlist below; otherwise we fall back to BusinessProfile.website_url.

export const DEFAULT_ORIGIN = 'https://ontherunelectrics.com.au';

// Hostnames permitted to appear in a customer-facing link.
const ALLOWED_HOSTS = [
  'ontherunelectrics.com.au',
  'www.ontherunelectrics.com.au',
  // Uploaded files are served from the bare platform host (verified against
  // existing Attachment records), so these must be exact matches too.
  'base44.app',
  'base44.com',
];

// Base44 preview/published hosts are allowed as suffix matches so the app keeps
// working inside the builder preview and on the platform subdomain.
const ALLOWED_HOST_SUFFIXES = [
  '.base44.app',
  '.base44.com',
];

function isAllowedHost(hostname: string): boolean {
  const host = String(hostname || '').toLowerCase();
  if (ALLOWED_HOSTS.includes(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function normalize(value: string): string {
  return String(value || '').replace(/\/$/, '');
}

/** Returns the origin only if it parses as https and its host is allowlisted. */
export function validateOrigin(candidate?: string | null): string | null {
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return null;
    if (!isAllowedHost(url.hostname)) return null;
    return normalize(url.origin);
  } catch (_) {
    return null;
  }
}

/**
 * Resolve the origin to use in outbound links.
 * Order: BusinessProfile.website_url → allowlisted Origin header → allowlisted
 * Referer origin → DEFAULT_ORIGIN. Never returns an unvalidated header value.
 */
export async function resolveTrustedOrigin(req: Request, base44: any): Promise<string> {
  const profiles = await base44.asServiceRole.entities.BusinessProfile.list('-created_date', 1).catch(() => []);
  const configured = validateOrigin(profiles?.[0]?.website_url);
  if (configured) return configured;

  const headerOrigin = validateOrigin(req.headers.get('origin'));
  if (headerOrigin) return headerOrigin;

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const refererOrigin = validateOrigin(new URL(referer).origin);
      if (refererOrigin) return refererOrigin;
    } catch (_) { /* malformed referer — fall through */ }
  }

  console.warn('[origin] no trusted origin resolved; using default');
  return DEFAULT_ORIGIN;
}

/**
 * Validates a file URL supplied by an untrusted caller before it is persisted to
 * an Attachment. Prevents storing staff-clickable links to arbitrary domains.
 */
export function isTrustedFileUrl(candidate?: string | null): boolean {
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && isAllowedHost(url.hostname);
  } catch (_) {
    return false;
  }
}