import { base44 } from "@/api/base44Client";

// Seeding runs server-side (functions/seedPlatform) in named, idempotent
// steps. Once setup is confirmed complete we cache that in localStorage so
// future logins skip the check entirely — no seeding on every login.

const CACHE_KEY = "otr_seed_complete";

// Friendly but accurate: each entry maps 1:1 to a real backend seeding step.
export const SEED_STEPS = [
  { key: "business", label: "Setting up your business details" },
  { key: "services", label: "Adding your services" },
  { key: "statuses", label: "Setting up job stages" },
  { key: "roles", label: "Setting up team roles" },
  { key: "booking", label: "Building the booking form" },
  { key: "templates", label: "Gathering message templates" },
  { key: "demo", label: "Loading jobs" },
  { key: "finish", label: "Finishing up" },
];

export function isSeedCached() {
  try {
    return localStorage.getItem(CACHE_KEY) === "true";
  } catch {
    return false;
  }
}

function cacheSeedComplete() {
  try {
    localStorage.setItem(CACHE_KEY, "true");
  } catch {
    // localStorage unavailable — worst case we re-check next login.
  }
}

// Quick server check: is setup already done? Caches the answer if yes.
export async function checkSeeded() {
  const res = await base44.functions.invoke("seedPlatform", { step: "check" });
  if (res.data?.seeded) cacheSeedComplete();
  return !!res.data?.seeded;
}

// Runs each seeding step in order, reporting real progress via onProgress.
export async function runSeed(onProgress) {
  for (let i = 0; i < SEED_STEPS.length; i++) {
    const step = SEED_STEPS[i];
    onProgress?.({ index: i, total: SEED_STEPS.length, ...step });
    await base44.functions.invoke("seedPlatform", { step: step.key });
  }
  cacheSeedComplete();
}