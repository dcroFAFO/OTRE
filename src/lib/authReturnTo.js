// @ts-check

// Shared by the auth pages (Login, Register, and any page that resumes a flow
// after sign-in, e.g. the MCP OAuth consent page). Keep the redirect
// validation in one place — it is security-sensitive and easy to drift.

// Resolve ?returnTo= to a safe same-origin path, else "/".
//
// The same-origin check alone is not enough: a value like /.//evil.com or
// /\evil.com parses same-origin but normalizes to a protocol-relative
// //evil.com when assigned to location.href — an open redirect. So require the
// resolved path to be exactly one leading slash (no "//" prefix, no backslash).
export const BOOTSTRAP_REDIRECT_PARAMS = [
  "access_token",
  "auth_state",
  "clear_access_token",
  "app_id",
  "app_base_url",
  "functions_version",
  "from_url",
];

export function sanitizeReturnTarget(raw, origin = window.location.origin) {
  if (!raw) return "/";
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return "/";
    // Strip all authentication/bootstrap controls so an untrusted return target
    // cannot inject a token, callback nonce, or backend override into the next load.
    for (const p of BOOTSTRAP_REDIRECT_PARAMS) {
      url.searchParams.delete(p);
    }
    const path = url.pathname + url.search + url.hash;
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/";
    return path;
  } catch {
    return "/";
  }
}

export function safeReturnTo() {
  const raw = new URLSearchParams(window.location.search).get("returnTo");
  return sanitizeReturnTarget(raw);
}
