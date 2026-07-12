// =============================================================================
// Central logging utility — the single place all app logging flows through.
//
// HOW TO USE:
//   import { logInfo, logWarn, logError, logDebug, addBreadcrumb } from "@/lib/logger";
//   logError("Failed to save job", error, { entity: "Job", recordId: job.id, action: "save" });
//
// DEBUG MODE (verbose logs + extra diagnostics) is enabled by ANY of:
//   - running locally in development (import.meta.env.DEV)
//   - localStorage.setItem("otr_debug", "1") then reload
//   - visiting any page with ?debug=1 (persists; ?debug=0 turns it off)
//
// INSPECTING ERRORS:
//   - Press Ctrl+Shift+D anywhere to open the developer Debug Panel
//   - Or call getErrorHistory() from this module / the browser console
//   - History is capped (HISTORY_LIMIT) and persisted to localStorage
//
// SAFETY: metadata is automatically redacted (passwords/tokens/keys/etc) and
// a rate limiter prevents runaway logging loops from spamming the console.
// =============================================================================

const DEBUG_KEY = "otr_debug";
const HISTORY_KEY = "otr_error_history";
const HISTORY_LIMIT = 50; // max stored errors — keeps storage bounded
const BREADCRUMB_LIMIT = 40; // max in-memory breadcrumbs

// ---- Debug mode -------------------------------------------------------------
// ?debug=1 in the URL persists debug mode to localStorage; ?debug=0 clears it.
(function initDebugFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "1") localStorage.setItem(DEBUG_KEY, "1");
    if (params.get("debug") === "0") localStorage.removeItem(DEBUG_KEY);
  } catch {
    // storage unavailable — debug mode simply stays off
  }
})();

export function isDebugMode() {
  try {
    return import.meta.env.DEV || localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDebugMode(on) {
  try {
    if (on) localStorage.setItem(DEBUG_KEY, "1");
    else localStorage.removeItem(DEBUG_KEY);
  } catch {
    // ignore
  }
}

// ---- User context -----------------------------------------------------------
// Set after login (DashboardLayout) so every log entry carries the user id.
// Only id + role are stored — never emails/names/tokens.
let userContext = null;

export function setUserContext(user) {
  userContext = user ? { id: user.id, role: user.role } : null;
}

// ---- Redaction ----------------------------------------------------------------
// Any object key matching this pattern has its value masked before logging.
const SENSITIVE_KEY = /pass(word)?|token|secret|api[-_]?key|authorization|credit[-_]?card|cvv|ssn/i;

export function redact(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

// ---- Error normalization -------------------------------------------------------
// Converts anything thrown (Error, axios error, string, object) into a safe,
// readable shape for logging and display.
export function normalizeError(err) {
  if (!err) return { message: "Unknown error" };
  if (err instanceof Error) {
    const errorWithResponse = /** @type {Error & { response?: { status?: number, data?: unknown } }} */ (err);
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      // Axios-style details from failed backend/network calls, when present
      status: errorWithResponse.response?.status,
      responseBody: errorWithResponse.response?.data ? redact(errorWithResponse.response.data) : undefined,
    };
  }
  if (typeof err === "string") return { message: err };
  try {
    return { message: JSON.stringify(redact(err)) };
  } catch {
    return { message: String(err) };
  }
}

// ---- History, breadcrumbs, subscribers ------------------------------------------
let history = [];
try {
  history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  if (!Array.isArray(history)) history = [];
} catch {
  history = [];
}

const breadcrumbs = []; // recent user/app actions, useful when tracing a crash
const listeners = new Set(); // debug panel subscribes here for live updates

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* listener errors must never break logging */ }
  });
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getErrorHistory() {
  return [...history];
}

export function getBreadcrumbs() {
  return [...breadcrumbs];
}

export function clearHistory() {
  history = [];
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  notify();
}

// Record an important app action (e.g. "backend:jobActions"). Breadcrumbs are
// shown in the Debug Panel and give context for what happened before a crash.
export function addBreadcrumb(action, data = {}) {
  breadcrumbs.push({ at: new Date().toISOString(), action, data: redact(data) });
  if (breadcrumbs.length > BREADCRUMB_LIMIT) breadcrumbs.shift();
}

// Short random id used to correlate related log lines (frontend <-> backend).
export function newCorrelationId() {
  return Math.random().toString(36).slice(2, 10);
}

// ---- Loop protection -------------------------------------------------------------
// Drops logs if more than 30 fire within 10 seconds (prevents spam loops).
let burst = [];
function rateLimited() {
  const now = Date.now();
  burst = burst.filter((t) => now - t < 10000);
  if (burst.length >= 30) return true;
  burst.push(now);
  return false;
}

// ---- Core emit --------------------------------------------------------------------
const CONSOLE_STYLES = {
  debug: "color:#94a3b8",
  info: "color:#0ea5e9",
  warn: "color:#f59e0b;font-weight:bold",
  error: "color:#ef4444;font-weight:bold",
};

function emit(level, message, error, metadata = {}, source = "app") {
  if (rateLimited()) return null;

  const normalized = error ? normalizeError(error) : null;
  const entry = {
    id: newCorrelationId(),
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    route: typeof window !== "undefined" ? window.location.pathname : null,
    userId: userContext?.id || null,
    userRole: userContext?.role || null,
    browser: typeof navigator !== "undefined" ? navigator.userAgent : null,
    metadata: redact(metadata),
    error: normalized,
    stack: normalized?.stack || null,
  };

  // Console output: warn/error always; info/debug only in debug mode.
  const context = {
    ...entry.metadata,
    route: entry.route,
    userId: entry.userId,
    ...(normalized ? { error: normalized } : {}),
  };
  const args = [`%c[OTR ${level.toUpperCase()}] ${message}`, CONSOLE_STYLES[level], context];
  if (level === "error") console.error(...args);
  else if (level === "warn") console.warn(...args);
  else if (isDebugMode()) (level === "debug" ? console.debug : console.info)(...args);

  // Warnings and errors go into the inspectable history store.
  if (level === "warn" || level === "error") {
    history.push(entry);
    if (history.length > HISTORY_LIMIT) history = history.slice(-HISTORY_LIMIT);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* storage full — keep in memory */ }
    notify();
  }
  return entry;
}

// ---- Public logging API -------------------------------------------------------------
export const logDebug = (message, metadata = {}, source) => emit("debug", message, null, metadata, source);
export const logInfo = (message, metadata = {}, source) => emit("info", message, null, metadata, source);
export const logWarn = (message, error = null, metadata = {}, source) => emit("warn", message, error, metadata, source);
export const logError = (message, error = null, metadata = {}, source) => emit("error", message, error, metadata, source);

// Track a failed network request / backend call with structured detail.
export function logFailedRequest({ requestType, name, operation, payloadSummary, status, errorBody, correlationId, ...rest }) {
  return emit(
    "error",
    `Request failed: ${name}${operation ? ` (${operation})` : ""}`,
    null,
    { requestType, name, operation, payloadSummary, status, errorBody: redact(errorBody), correlationId, ...rest },
    "network"
  );
}

// Track a failed entity (database) operation with context.
export function logEntityError(operation, entityName, error, metadata = {}) {
  return emit("error", `Entity operation failed: ${entityName}.${operation}`, error, { entity: entityName, operation, ...metadata }, "entity");
}
