import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Zap, ArrowLeft, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import SEO from "@/components/SEO";
import AccountDetailsCard from "@/components/portal/settings/AccountDetailsCard";
import ScootersCard from "@/components/portal/settings/ScootersCard";
import ConnectedAccountsCard from "@/components/portal/settings/ConnectedAccountsCard";

export default function PortalSettings() {
  const { user, isLoading } = useCurrentUser();
  const { data: { business } } = usePlatformConfig();

  const { data: settings, isLoading: loadingSettings, refetch } = useQuery({
    queryKey: ["customerSettings", user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("customerSettings", { action: "get" });
      return res.data;
    },
    enabled: !!user && !isStaff(user.role),
  });

  const seo = <SEO title="Settings | On The Run Electrics" description="Manage your account details, saved scooters, and connected profiles." canonical="/portal/settings" noindex />;

  if (isLoading) return <>{seo}<div className="fixed inset-0 grid place-items-center bg-background"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div></>;

  if (!user) {
    base44.auth.redirectToLogin(window.location.href);
    return seo;
  }

  if (isStaff(user.role)) {
    return (
      <>
      {seo}
      <div className="min-h-screen grid place-items-center bg-background px-5">
        <div className="rounded-3xl border border-border bg-card p-10 text-center max-w-md shadow-xl">
          <h1 className="font-heading text-2xl font-extrabold">Staff account</h1>
          <p className="mt-2 text-muted-foreground">Customer settings are for customer accounts — manage customers from the dashboard.</p>
          <Link to="/dashboard" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Go to dashboard</Link>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    {seo}
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><span className="grid place-items-center h-8 w-8 rounded-lg bg-accent/15 text-accent"><Zap className="h-4 w-4" /></span><span className="font-heading font-extrabold">{business.name}</span></Link>
          <button onClick={() => base44.auth.logout()} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/portal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to My Account</Link>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account details, saved scooters, and profiles.</p>

        {loadingSettings ? (
          <div className="mt-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="mt-6 space-y-5">
            <AccountDetailsCard profile={settings?.profile} onSaved={refetch} />
            <ScootersCard scooters={settings?.scooters || []} onChanged={refetch} />
            <ConnectedAccountsCard connections={settings?.connections || []} onChanged={refetch} />
          </div>
        )}
      </main>
    </div>
    </>
  );
}