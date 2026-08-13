import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Zap, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import SEO from "@/components/SEO";
import AccountDetailsCard from "@/components/portal/settings/AccountDetailsCard";
import ScootersCard from "@/components/portal/settings/ScootersCard";
import SocialProfilesCard from "@/components/portal/settings/SocialProfilesCard";
import { CardSkeleton, ErrorState, PageLoader, UnauthorizedState } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function PortalSettings() {
  const { user, isLoading } = useCurrentUser();
  const { data: { business } } = usePlatformConfig();

  const { data: settings, isLoading: loadingSettings, error, refetch } = useQuery({
    queryKey: ["customerSettings", user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("customerSettings", { action: "get" });
      return res.data;
    },
    enabled: !!user && !isStaff(user.role),
  });

  const seo =     <SEO title="Settings | On The Run Electrics" description="Manage your account details, saved scooters, and connected profiles." canonical="/portal/settings" noindex />;

  if (isLoading) return <>{seo}<PageLoader label="Loading settings" fullScreen /></>;

  if (!user) {
    base44.auth.redirectToLogin(window.location.href);
    return seo;
  }

  if (isStaff(user.role)) {
    return (
      <>
      {seo}
      <UnauthorizedState title="Staff account" description="Customer settings are only available to customer accounts." actionTo="/dashboard" actionLabel="Go to dashboard" />
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
          <Button type="button" variant="ghost" size="touch" onClick={() => base44.auth.logout()}>Sign out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/portal" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to My Account</Link>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account details, saved scooters, and profiles.</p>

        {error ? (
          <ErrorState className="mt-6" title="Settings could not be loaded" error={error} onRetry={refetch} />
        ) : loadingSettings ? (
          <div className="mt-6 space-y-4" aria-label="Loading settings">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <AccountDetailsCard profile={settings?.profile} onSaved={refetch} />
            <ScootersCard scooters={settings?.scooters || []} onChanged={refetch} />
            <SocialProfilesCard connections={settings?.connections || []} onChanged={refetch} />
          </div>
        )}
      </main>
    </div>
    </>
  );
}
