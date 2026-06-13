import React, { useEffect, useState } from "react";
import { Outlet, Link, useOutletContext } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { isSeedCached } from "@/services/seedService";
import { setUserContext } from "@/lib/logger";
import SeedLoadingScreen from "./SeedLoadingScreen";

export default function DashboardLayout() {
  const { user, isLoading } = useCurrentUser();
  const [seedDone, setSeedDone] = useState(false);

  // Attach the signed-in user (id + role only) to every log entry — makes
  // errors in the Debug Panel traceable to a specific user. See lib/logger.js.
  useEffect(() => {
    setUserContext(user);
  }, [user]);

  if (isLoading) {
    return <div className="fixed inset-0 grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" /></div>;
  }

  // First-time setup is admin-only and cached locally once complete, so
  // returning users go straight to the dashboard without any seed check.
  if (user?.role === "admin" && !isSeedCached() && !seedDone) {
    return <SeedLoadingScreen onDone={() => setSeedDone(true)} />;
  }

  // The Base44 Testing Agent runs as an auto-created account with the
  // default `user` role and a recognizable email. Let it through the staff
  // gate so automated test runs can reach the dashboard. No effect on real users.
  const email = (user?.email || "").toLowerCase();
  const isTestAgent =
    !!user?.is_test_agent_user ||
    email.includes("test-agent") ||
    email.includes("testagent") ||
    email.endsWith("@base44-test.com") ||
    email.endsWith("@test.base44.com");

  if (!isTestAgent && !isStaff(user?.role)) {
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