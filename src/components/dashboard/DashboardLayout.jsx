import React, { useEffect } from "react";
import { Outlet, Link, useOutletContext } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { setUserContext } from "@/lib/logger";

export default function DashboardLayout() {
  const { user, isLoading } = useCurrentUser();
  useEffect(() => {
    setUserContext(user);
  }, [user]);

  if (isLoading) {
    return <div className="fixed inset-0 grid place-items-center bg-background"><div className="h-8 w-8 rounded-full border-4 border-border border-t-accent animate-spin" /></div>;
  }

  if (!isStaff(user?.role)) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground px-5">
        <div className="rounded-3xl border border-border bg-card p-10 text-center max-w-md">
          <h1 className="font-heading text-2xl font-extrabold">Staff access only</h1>
          <p className="mt-2 text-muted-foreground">This area is for {`${user?.full_name ? user.full_name.split(" ")[0] + ", but your" : "your"}`} account isn't a staff member.</p>
          <Link to="/portal" className="mt-5 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-foreground">Go to customer portal</Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell user={user}>
      <Outlet context={{ user }} />
    </DashboardShell>
  );
}

export function useDashboardUser() {
  return useOutletContext()?.user;
}