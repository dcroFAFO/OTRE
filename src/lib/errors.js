// Centralised error normalisation. Turns any thrown value (axios error,
// backend {error} payload, network failure, permission denial) into a single
// friendly, non-technical message plus metadata the UI can act on.

const FRIENDLY = {
  network: "Can't reach the server. Check your connection and try again.",
  unauthorized: "You don't have permission to do that.",
  notFound: "This item couldn't be found — it may have been removed.",
  timeout: "The server took too long to respond. Please try again.",
  generic: "Something went wrong. Please try again.",
};

// Pulls a server-supplied message if it's safe/human (short, no stack traces).
function cleanServerMessage(msg) {
  if (!msg || typeof msg !== "string") return null;
  const trimmed = msg.trim();
  if (!trimmed) return null;
  // Reject obviously technical strings (stack traces, JSON dumps, code refs).
  if (/(\bat\s.+:\d+\b|TypeError|undefined is not|\{".+":|\n\s+at\s)/i.test(trimmed)) return null;
  if (trimmed.length > 180) return null;
  return trimmed;
}

export function normalizeError(err) {
  // Axios-style error with a backend response
  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data;
  const serverMsg = cleanServerMessage(data?.error || data?.message || err?.message);

  let kind = "generic";
  let retryable = true;

  if (err?.message === "Network Error" || err?.code === "ERR_NETWORK" || (!status && err?.request)) {
    kind = "network";
  } else if (err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "")) {
    kind = "timeout";
  } else if (status === 401 || status === 403) {
    kind = "unauthorized";
    retryable = false;
  } else if (status === 404) {
    kind = "notFound";
    retryable = false;
  } else if (status >= 400 && status < 500) {
    // Client errors are usually not worth blind retries
    retryable = false;
  }

  // Prefer a clean server message for 4xx (it's usually the most specific);
  // for network/5xx fall back to the friendly canned copy.
  const message =
    (kind === "unauthorized" || kind === "notFound" || (status >= 400 && status < 500) ? serverMsg : null) ||
    FRIENDLY[kind] ||
    serverMsg ||
    FRIENDLY.generic;

  return { kind, message, retryable, status };
}

export function errorMessage(err) {
  return normalizeError(err).message;
}