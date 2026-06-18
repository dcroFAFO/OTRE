// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL ROLE & PERMISSION SOURCE OF TRUTH
// ─────────────────────────────────────────────────────────────────────────────
// This is the single place that defines the admin role hierarchy and what each
// role is allowed to do. Everything else (UI guards, route guards, backend
// checks) should import from here — never hardcode role strings elsewhere.
//
// Hierarchy (highest → lowest):
//   owner > admin > manager > support_staff > customer
//
// Legacy roles still present in the data (admin/employee/technician/customer)
// are mapped into this hierarchy via LEGACY_ROLE_MAP so existing accounts keep
// working with zero migration.

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  SUPPORT_STAFF: "support_staff",
  CUSTOMER: "customer",
};

// Numeric rank — higher means more privileged. Used for "at least" checks.
export const ROLE_RANK = {
  owner: 100,
  admin: 80,
  manager: 60,
  support_staff: 40,
  customer: 10,
};

// Human-friendly metadata for badges / labels / role pickers.
export const ROLE_META = {
  owner: { key: "owner", label: "Owner", badgeClass: "bg-violet-100 text-violet-700", staff: true },
  admin: { key: "admin", label: "Admin", badgeClass: "bg-blue-100 text-blue-700", staff: true },
  manager: { key: "manager", label: "Manager", badgeClass: "bg-emerald-100 text-emerald-700", staff: true },
  support_staff: { key: "support_staff", label: "Support Staff", badgeClass: "bg-amber-100 text-amber-700", staff: true },
  customer: { key: "customer", label: "Customer", badgeClass: "bg-slate-100 text-slate-600", staff: false },
};

// Map legacy / Base44 role strings onto the new hierarchy. Unknown → customer.
export const LEGACY_ROLE_MAP = {
  owner: "owner",
  admin: "admin",
  employee: "manager",
  manager: "manager",
  technician: "support_staff",
  support_staff: "support_staff",
  customer: "customer",
  user: "customer",
};

// Normalise any raw role value (legacy or new) into a canonical hierarchy role.
export function normalizeRole(rawRole) {
  if (!rawRole) return ROLES.CUSTOMER;
  return LEGACY_ROLE_MAP[rawRole] || ROLES.CUSTOMER;
}

export function roleRank(rawRole) {
  return ROLE_RANK[normalizeRole(rawRole)] ?? 0;
}

// True when the (normalised) role is at least as privileged as `minRole`.
export function hasAtLeastRole(rawRole, minRole) {
  return roleRank(rawRole) >= (ROLE_RANK[minRole] ?? Infinity);
}

export function isStaffRole(rawRole) {
  return !!ROLE_META[normalizeRole(rawRole)]?.staff;
}

export function isCustomerRole(rawRole) {
  return normalizeRole(rawRole) === ROLES.CUSTOMER;
}

export function roleLabel(rawRole) {
  return ROLE_META[normalizeRole(rawRole)]?.label || "Unknown";
}

export function roleBadgeClass(rawRole) {
  return ROLE_META[normalizeRole(rawRole)]?.badgeClass || "bg-slate-100 text-slate-600";
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITIES
// ─────────────────────────────────────────────────────────────────────────────
// Granular capability keys grouped by area. A role is granted a capability if
// it (or a higher role, via inheritance) lists it. "*" means all capabilities.
//
// To add a new capability later: add the key to the relevant role array below.
// To add a new role: add it to ROLES/ROLE_RANK/ROLE_META + an entry here.

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
  ROLES_MANAGE: "roles.manage",
};

const C = CAPABILITIES;

// Direct capabilities per role (inheritance applied in capabilitiesFor()).
const ROLE_CAPS = {
  owner: ["*"],
  admin: [
    C.RECORD_VIEW, C.RECORD_CREATE, C.RECORD_UPDATE,
    C.NOTE_VIEW, C.NOTE_CREATE, C.NOTE_EDIT,
    C.LOG_VIEW, C.ADMIN_DASHBOARD, C.SETTINGS_MANAGE,
    C.USERS_MANAGE,
  ],
  manager: [
    C.RECORD_VIEW, C.RECORD_CREATE, C.RECORD_UPDATE,
    C.NOTE_VIEW, C.NOTE_CREATE, C.NOTE_EDIT,
    C.LOG_VIEW, C.ADMIN_DASHBOARD,
  ],
  support_staff: [
    C.RECORD_VIEW,
    C.NOTE_VIEW, C.NOTE_CREATE,
    C.ADMIN_DASHBOARD,
  ],
  customer: [],
};

// Resolve the full capability set for a role, inheriting from all lower roles
// up to (and including) the role itself. Higher rank inherits everything below.
export function capabilitiesFor(rawRole) {
  const role = normalizeRole(rawRole);
  if (ROLE_CAPS[role]?.includes("*")) return new Set(["*"]);
  const rank = ROLE_RANK[role] ?? 0;
  const set = new Set();
  for (const [r, caps] of Object.entries(ROLE_CAPS)) {
    if ((ROLE_RANK[r] ?? 0) <= rank) caps.forEach((c) => set.add(c));
  }
  return set;
}

export function hasCapability(rawRole, capability) {
  const caps = capabilitiesFor(rawRole);
  return caps.has("*") || caps.has(capability);
}

// Convenience: assignable roles a given actor may grant (cannot grant above self).
export function assignableRoles(actorRole) {
  const actorRank = roleRank(actorRole);
  return Object.values(ROLE_META)
    .filter((m) => (ROLE_RANK[m.key] ?? 0) <= actorRank)
    .map((m) => m.key);
}