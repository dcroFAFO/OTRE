import React, { useEffect, useState } from "react";
import { Outlet, Link, useOutletContext } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { seedIfEmpty } from "@/services/seedService";

export default function DashboardLayout() {
  const { user, isLoading } = useCurrentUser();
  const [ready, setReady] = useState(false);

  // Seeding is a one-time setup task — only run it for admins. Other staff
  // (e.g. technicians) skip it and load the dashboard immediately.
  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "admin") {
      seedIfEmpty().finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [isLoading, user?.role]);

  if (isLoading || !ready) {
    return <div className="fixed inset-0 grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" /></div>;
  }

  if (!isStaff(user?.role)) {
    return (
      <div className="min-h-screen grid place-items-center bg-secondary/30 px-5">
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