import { base44 } from "@/api/base44Client";

// Shared backend-function caller. Unlike a raw invoke, this inspects the
// response body: backend functions return { error: "..." } with a 4xx/5xx
// status on failure, but some return 200 with an { error } field. Either way
// we throw so callers (and toasts) reliably see the failure instead of
// silently treating it as success.
export async function invokeFn(name, payload = {}) {
  const res = await base44.functions.invoke(name, payload);
  const data = res?.data;
  if (data && typeof data === "object" && data.error) {
    const err = new Error(data.error);
    err.response = { status: res.status || 400, data };
    throw err;
  }
  return data;
}