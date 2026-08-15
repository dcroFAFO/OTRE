// Read-only Base44 runtime probe. Run with:
// Get-Content -Raw scripts/base44-runtime-readiness.ts | npx base44 exec --privileged
//
// The output intentionally contains no record values, user IDs, email
// addresses, phone numbers, tokens, or provider responses.

const entityNames = [
  "User",
  "Customer",
  "BookingFieldConfig",
  "ServiceItem",
  "Invoice",
  "PaymentProviderConfig",
  "PaymentEvent",
  "Attachment",
  "PhoneVerificationUse",
  "NotificationEvent",
  "NotificationDelivery",
  "FeedbackInvitation",
];

const currentUser = await base44.auth.me().catch(() => null);
const report = {
  authenticated: Boolean(currentUser),
  role: currentUser?.role || null,
  entities: {},
};

for (const entityName of entityNames) {
  try {
    const rows = await base44.entities[entityName].list("-created_date", 1);
    report.entities[entityName] = {
      available: true,
      has_records: Array.isArray(rows) && rows.length > 0,
    };
  } catch (error) {
    report.entities[entityName] = {
      available: false,
      error_code: String(error?.code || error?.status || "unavailable").slice(0, 80),
    };
  }
}

console.log(JSON.stringify(report, null, 2));
