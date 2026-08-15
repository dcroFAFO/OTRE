// ─────────────────────────────────────────────────────────────────────────────
// ROLE SOURCE OF TRUTH
// ─────────────────────────────────────────────────────────────────────────────
// The customer-facing application exposes two roles only. Legacy staff role
// values are deliberately treated as customers until they are migrated by the
// backend; this prevents an unknown value from gaining staff UI access.

export const ROLES = {
  ADMIN: "admin",
  CUSTOMER: "customer",
};

export const ROLE_RANK = {
  admin: 100,
  customer: 10,
};

export const ROLE_META = {
  admin: { key: "admin", label: "Admin", badgeClass: "bg-blue-100 text-blue-700", staff: true },
  customer: { key: "customer", label: "Customer", badgeClass: "bg-slate-100 text-slate-600", staff: false },
};

const LEGACY_STAFF_REQUIREMENTS = new Set(["technician", "employee", "staff"]);

export const CAPABILITIES = {
  LOG_VIEW: "log.view",
};

export function normalizeRole(role) {
  if (!role) return ROLES.CUSTOMER;
  const normalized = String(role).toLowerCase();
  return ROLE_META[normalized]?.key || ROLES.CUSTOMER;
}

export function roleRank(role) {
  return ROLE_RANK[normalizeRole(role)] ?? 0;
}

export function hasAtLeastRole(role, minRole) {
  const required = String(minRole || "").toLowerCase();
  const requiredRank = LEGACY_STAFF_REQUIREMENTS.has(required)
    ? ROLE_RANK.admin
    : ROLE_RANK[required];
  return roleRank(role) >= (requiredRank ?? Infinity);
}

export function isStaffRole(role) {
  return ROLE_META[normalizeRole(role)]?.staff === true;
}

export function isCustomerRole(role) {
  return normalizeRole(role) === ROLES.CUSTOMER;
}

export function roleLabel(role) {
  return ROLE_META[normalizeRole(role)]?.label || "Customer";
}

export function roleBadgeClass(role) {
  return ROLE_META[normalizeRole(role)]?.badgeClass || "bg-slate-100 text-slate-600";
}

export function capabilitiesFor(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === ROLES.ADMIN) return new Set(["*", CAPABILITIES.LOG_VIEW]);
  return new Set();
}

export function hasCapability(role, capability) {
  const caps = capabilitiesFor(role);
  return caps.has("*") || caps.has(capability);
}

export function assignableRoles(actorRole) {
  const actorRank = roleRank(actorRole);
  return Object.values(ROLE_META)
    .filter((m) => (ROLE_RANK[m.key] ?? 0) <= actorRank)
    .map((m) => m.key);
}
