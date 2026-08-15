// @ts-check

import { logError } from "@/lib/logger";

const release = import.meta.env.VITE_RELEASE_ID || "development";

function reportingEndpoint() {
  const configured = import.meta.env.VITE_CLIENT_ERROR_ENDPOINT;
  if (!configured || typeof window === "undefined") return null;
  try {
    const endpoint = new URL(configured, window.location.origin);
    return endpoint.origin === window.location.origin ? endpoint.toString() : null;
  } catch {
    return null;
  }
}

/** @param {unknown} error @param {{ source?: string, component?: string | null }} context */
function minimalPayload(error, context) {
  return {
    event_id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    occurred_at: new Date().toISOString(),
    release,
    error_name: error instanceof Error ? error.name : "UnknownError",
    route: typeof window === "undefined" ? null : window.location.pathname,
    source: context.source || "application",
    component: context.component || null,
  };
}

/**
 * Persist a rich, locally redacted diagnostic and optionally send a deliberately
 * minimal, PII-free event to a same-origin endpoint configured at build time.
 */
/** @param {unknown} error @param {{ source?: string, component?: string | null, [key: string]: unknown }} [context] */
export function reportClientError(error, context = {}) {
  const entry = logError("Unhandled client error", error, context, "client");
  const endpoint = reportingEndpoint();
  if (!endpoint) return entry;

  const payload = JSON.stringify(minimalPayload(error, context));
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
    } else {
      void fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    }
  } catch {
    // Reporting must never trigger a second application failure.
  }
  return entry;
}

export function getClientReportingStatus() {
  return {
    enabled: Boolean(reportingEndpoint()),
    release,
  };
}
