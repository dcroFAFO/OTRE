import { base44 } from "@/api/base44Client";

// Seeding now runs entirely server-side in a single backend call (functions/seedPlatform),
// so the browser makes ONE request instead of ~50 sequential entity calls. This avoids the
// client-side rate limit that previously fired on dashboard load. The backend function is
// idempotent (guards on a "seed_complete" AppSetting), so calling it repeatedly is safe.

let seedPromise = null;

export async function seedIfEmpty() {
  if (!seedPromise) {
    seedPromise = base44.functions
      .invoke("seedPlatform", {})
      .then((res) => res?.data?.seeded === true)
      .catch(() => {
        // On any error, reset so a later mount can retry, and don't block the dashboard.
        seedPromise = null;
        return false;
      });
  }
  return seedPromise;
}