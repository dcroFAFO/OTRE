// Shared retry helper for outbound provider calls (Resend, Twilio).
//
// Transient failures — network blips, provider 5xx, rate limiting — are common
// enough that a single attempt silently drops customer notifications. Retries
// are deliberately limited to conditions that are safe to repeat:
//   - network / fetch errors (the request may never have reached the provider)
//   - 429 Too Many Requests
//   - 5xx server errors
// 4xx responses (bad address, invalid number, auth failure) are permanent and
// returned immediately — repeating them just burns quota and delays the caller.

const RETRYABLE_STATUS = (status: number) => status === 429 || status >= 500;

function backoffMs(attempt: number) {
  // 300ms, 900ms — plus jitter so concurrent sends don't retry in lockstep.
  return 300 * Math.pow(3, attempt - 1) + Math.floor(Math.random() * 200);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch() with bounded retries on transient failures.
 * Always resolves with the final Response, or throws the last network error.
 */
export async function fetchWithRetry(url, init, { attempts = 3, label = 'request' } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || !RETRYABLE_STATUS(res.status)) return res;

      if (attempt === attempts) {
        console.error(`[retry] ${label} failed after ${attempts} attempts (status ${res.status})`);
        return res;
      }
      console.warn(`[retry] ${label} attempt ${attempt} got status ${res.status} — retrying`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        console.error(`[retry] ${label} failed after ${attempts} attempts:`, error.message);
        throw error;
      }
      console.warn(`[retry] ${label} attempt ${attempt} errored (${error.message}) — retrying`);
    }

    await sleep(backoffMs(attempt));
  }

  throw lastError || new Error(`${label} failed`);
}