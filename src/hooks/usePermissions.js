// Central hook for permission-based UI and route logic.
// Wraps the current user and exposes capability/role checks from config/roles.js
// so components never hardcode role strings.
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  hasCapability,
  hasAtLeastRole,
  isStaffRole,
  isCustomerRole,
  roleLabel,
  roleBadgeClass,
  capabilitiesFor,
  assignableRoles,
  normalizeRole,
} from "@/config/roles";

export function usePermissions() {
  const { user, isLoading } = useCurrentUser();
  const role = normalizeRole(user?.role);

  return {
    user,
    isLoading,
    role,
    rawRole: user?.role,
    roleLabel: roleLabel(user?.role),
    roleBadgeClass: roleBadgeClass(user?.role),
    isStaff: isStaffRole(user?.role),
    isCustomer: isCustomerRole(user?.role),
    can: (capability) => hasCapability(user?.role, capability),
    atLeast: (minRole) => hasAtLeastRole(user?.role, minRole),
    capabilities: capabilitiesFor(user?.role),
    assignableRoles: assignableRoles(user?.role),
  };
}