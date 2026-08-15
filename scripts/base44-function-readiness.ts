// Read-only and negative-path Base44 function probe. Run from a staging-bound
// checkout with:
// Get-Content -Raw scripts/base44-function-readiness.ts | npx base44 exec --privileged
//
// Payloads use no customer data and are chosen to validate authorization or
// input boundaries before any mutation can occur.

const checks = [
  ["publicSiteConfig", {}],
  ["publicCatalog", { page: 1, page_size: 1 }],
  ["sitemapPages", {}],
  ["appBootstrap", {}],
  ["customerRead", { action: "list", page: 1, limit: 1 }],
  ["attachmentActions", { action: "list", job_id: "runtime-probe-missing" }],
  ["invoiceActions", {
    action: "record_manual_payment",
    jobId: "runtime-probe-missing",
    amount: 1,
    method: "cash",
  }],
  ["createBooking", {}],
  ["sendSignupPhoneOtp", {}],
  ["verifySignupPhoneOtp", {}],
  ["claimSignupPhoneVerification", {}],
  ["notificationPreferenceActions", { action: "get" }],
  ["processNotificationOutbox", {}],
];

const results = {};
for (const [name, payload] of checks) {
  try {
    const response = await base44.functions.invoke(name, payload);
    results[name] = {
      reachable: true,
      status: Number(response?.status || 200),
      has_data: Boolean(response?.data),
    };
  } catch (error) {
    const status = Number(error?.status || error?.response?.status || 0);
    results[name] = {
      reachable: status !== 404 || !/function/i.test(String(error?.message || "")),
      status: status || null,
      error_code: String(error?.code || error?.response?.data?.code || "rejected").slice(0, 80),
    };
  }
}

console.log(JSON.stringify(results, null, 2));
