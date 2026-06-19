// ─────────────────────────────────────────────────────────────────────────────
// ROLE & PERMISSION SOURCE OF TRUTH
// ─────────────────────────────────────────────────────────────────────────────
// This is the single place that defines roles and what each role is allowed to
// do. Everything else (UI guards, route guards, backend checks) should import
// from here — never hardcode role strings elsewhere.
//
// Hierarchy (highest → lowest):
//   admin > employee > technician > customer

export const ROLES = {
  ADMIN: "admin",
  EMPLOYEE: "employee",
  TECHNICIAN: "technician",
  CUSTOMER: "customer",
};

// Numeric rank — higher means more privileged. Used for "at least" checks.
export const ROLE_RANK = {
  admin: 100,
  employee: 60,
  technician: 40,
  customer: 10,
};

// Human-friendly metadata for badges / labels / role pickers.
export const ROLE_META = {
  admin: { key: "admin", label: "Admin", badgeClass: "bg-blue-100 text-blue-700", staff: true },
  employee: { key: "employee", label: "Employee", badgeClass: "bg-emerald-100 text-emerald-700", staff: true },
  technician: { key: "technician", label: "Technician", badgeClass: "bg-amber-100 text-amber-700", staff: true },
  customer: { key: "customer", label: "Customer", badgeClass: "bg-slate-100 text-slate-600", staff: false },
};

export function roleRank(role) {
  return ROLE_RANK[role] ?? 0;
}

// True when the role is at least as privileged as `minRole`.
export function hasAtLeastRole(role, minRole) {
  return roleRank(role) >= (ROLE_RANK[minRole] ?? Infinity);
}

export function isStaffRole(role) {
  return !!ROLE_META[role]?.staff;
}

export function isCustomerRole(role) {
  return role === ROLES.CUSTOMER;
}

export function roleLabel(role) {
  return ROLE_META[role]?.label || "Unknown";
}

export function roleBadgeClass(role) {
  return ROLE_META[role]?.badgeClass || "bg-slate-100 text-slate-600";
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITIES
// ─────────────────────────────────────────────────────────────────────────────
// Granular capability keys grouped by area. A role is granted a capability if
// it (or a higher role, via inheritance) lists it. "*" means all capabilities.

export const CAPABILITIES = {
  // Records / operations
  RECORD_VIEW: "record.view",
  RECORD_CREATE: "record.create",
  RECORD_UPDATE: "record.update",
  RECORD_DELETE: "record.delete",
  // Internal notes
  NOTE_VIEW: "note.view",
  NOTE_CREATE: "note.create",
  NOTE_EDIT: "note.edit",
  // Activity logs
  LOG_VIEW: "log.view",
  // Admin areas
  ADMIN_DASHBOARD: "admin.dashboard",
  // Sensitive controls
  SETTINGS_MANAGE: "settings.manage",
  USERS_MANAGE: "users.manage",
};

const C = CAPABILITIES;

// Direct capabilities per role (inheritance applied in capabilitiesFor()).
const ROLE_CAPS = {
  admin: ["*"],
  employee: [
    C.RECORD_VIEW, C.RECORD_CREATE, C.RECORD_UPDATE,
    C.NOTE_VIEW, C.NOTE_CREATE, C.NOTE_EDIT,
    C.LOG_VIEW, C.ADMIN_DASHBOARD, C.SETTINGS_MANAGE,
    C.USERS_MANAGE,
  ],
  technician: [
    C.RECORD_VIEW,
    C.NOTE_VIEW, C.NOTE_CREATE,
    C.ADMIN_DASHBOARD,
  ],
  customer: [],
};

// Resolve the full capability set for a role, inheriting from all lower roles
// up to (and including) the role itself. Higher rank inherits everything below.
export function capabilitiesFor(role) {
  const rank = ROLE_RANK[role] ?? 0;
  const set = new Set();
  for (const [r, caps] of Object.entries(ROLE_CAPS)) {
    if ((ROLE_RANK[r] ?? 0) <= rank) caps.forEach((c) => set.add(c));
  }
  return set;
}

export function hasCapability(role, capability) {
  const caps = capabilitiesFor(role);
  return caps.has("*") || caps.has(capability);
}

// Convenience: assignable roles a given actor may grant (cannot grant above self).
export function assignableRoles(actorRole) {
  const actorRank = roleRank(actorRole);
  return Object.values(ROLE_META)
    .filter((m) => (ROLE_RANK[m.key] ?? 0) <= actorRank)
    .map((m) => m.key);
}