import React, { useEffect } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { setUserContext } from "@/lib/logger";
import SEO from "@/components/SEO";
import PageLoader from "@/components/shared/PageLoader";
import UnauthorizedState from "@/components/shared/UnauthorizedState";
import InvoicePaymentReturnAlert from "@/components/shared/InvoicePaymentReturnAlert";

export default function DashboardLayout() {
  const { user, isLoading } = useCurrentUser();
  useEffect(() => {
    setUserContext(user);
  }, [user]);

  const dashboardSeo = <SEO title="Staff Dashboard | On The Run Electrics" description="Private staff dashboard for managing On The Run Electrics repairs, customers, inventory, invoices and operations." canonical="/dashboard" noindex />;

  if (isLoading) {
    return <>{dashboardSeo}<PageLoader label="Loading staff workspace" /></>;
  }

  if (!isStaff(user?.role)) {
    return (
      <>
        {dashboardSeo}
        <UnauthorizedState
          title="Staff access only"
          description="This workspace is available to authorised staff accounts. Your customer account is still available in My Account."
          actionTo="/portal"
          actionLabel="Go to My Account"
        />
      </>
    );
  }

  return (
    <>
    {dashboardSeo}
    <DashboardShell user={user}>
      <InvoicePaymentReturnAlert />
      <Outlet context={{ user }} />
    </DashboardShell>
    </>
  );
}

export function useDashboardUser() {
  const context = /** @type {{ user?: Record<string, any> } | null} */ (useOutletContext());
  return context?.user;
}
