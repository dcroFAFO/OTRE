import { useDashboardUser } from "@/components/dashboard/DashboardLayout";
import { crmViewScope, crmCan, crmHasAccess } from "@/config/crmConfig";

// Wraps the existing dashboard user with CRM role helpers.
export function useCRMUser() {
  const user = useDashboardUser();
  return {
    user,
    role: user?.role,
    scope: crmViewScope(user?.role),
    hasAccess: crmHasAccess(user?.role),
    can: (action) => crmCan(user?.role, action),
  };
}