import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, ArrowLeft, ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import SEO from "@/components/SEO";
import CustomerJobModal from "@/components/portal/CustomerJobModal";
import CustomerBookingModal from "@/components/portal/CustomerBookingModal";
import { Button } from "@/components/ui/button";
import MyJobsCard from "@/components/portal/account/MyJobsCard";
import MyInvoicesCard from "@/components/portal/account/MyInvoicesCard";
import MyRewardsCard from "@/components/portal/rewards/MyRewardsCard";
import SupportCard from "@/components/portal/account/SupportCard";
import GettingStartedPanel from "@/components/portal/account/GettingStartedPanel";
import { PageLoader, UnauthorizedState } from "@/components/shared";
import { getCustomerPortalJob, getCustomerPortalOverview } from "@/services/customerPortalService";

// Central customer dashboard. Settings data is fetched independently for the
// booking flow and onboarding checklist, so it never blocks jobs or invoices.
export default function PortalAccount() {
  const { user, isLoading } = useCurrentUser();
  const { data: { business, app } } = usePlatformConfig();
  const [selectedJob, setSelectedJob] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user || isStaff(user.role)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("book") === "1") setShowBooking(true);
  }, [user]);

  useEffect(() => {
    if (!user || isStaff(user.role)) return;
    setShowGettingStarted(!user.hasSeenCustomerPortalTutorial);
  }, [user?.id, user?.hasSeenCustomerPortalTutorial, user?.role]);

  const { data: settings, isLoading: loadingSettings, error: settingsError, refetch: refetchSettings } = useQuery({
    queryKey: ["customerSettings", user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("customerSettings", { action: "get" });
      return res.data;
    },
    enabled: !!user && !isStaff(user.role),
  });

  const {
    data: portalOverview,
    isLoading: loadingPortal,
    error: portalError,
    refetch: refetchPortal,
  } = useQuery({
    queryKey: ["customerPortalOverview", user?.id],
    queryFn: getCustomerPortalOverview,
    enabled: !!user && !isStaff(user.role),
  });
  const jobs = (portalOverview?.jobs || []).map((job) => ({
    ...job,
    customer_name: portalOverview?.account?.name || "Your repair",
  }));
  const invoices = portalOverview?.invoices || [];
  const scooters = portalOverview?.scooters || [];

  const seo = <SEO title="My Account | On The Run Electrics" description="Your repair jobs, invoices, rewards, bookings, and support in one place." canonical="/portal" noindex />;

  if (isLoading) return <>{seo}<PageLoader label="Loading your account" fullScreen /></>;

  if (!user) {
    base44.auth.redirectToLogin(window.location.href);
    return seo;
  }

  if (isStaff(user.role)) {
    return (
      <>
      {seo}
      <UnauthorizedState title="Staff account" description="My Account is for customers. Use the staff dashboard to manage jobs and customers." actionTo="/dashboard" actionLabel="Go to dashboard" />
      </>
    );
  }

  return (
    <>
    {seo}
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex min-h-11 items-center gap-2"><span className="grid place-items-center h-8 w-8 rounded-lg bg-accent/15 text-accent"><Zap className="h-4 w-4" aria-hidden="true" /></span><span className="font-heading font-extrabold">{business.name}</span></Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="touch"><Link to="/portal/settings">Settings</Link></Button>
            <Button type="button" variant="ghost" size="touch" onClick={() => base44.auth.logout()}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to site</Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-extrabold">My Account</h1>
            <p className="text-sm text-muted-foreground">Your {app.terminology.jobPlural}, invoices, rewards, bookings, and support.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!showGettingStarted ? (
              <Button type="button" variant="outline" size="touch" onClick={() => setShowGettingStarted(true)}>
                <ListChecks className="h-4 w-4" aria-hidden="true" /> Getting started
              </Button>
            ) : null}
            <Button type="button" size="touch" onClick={() => setShowBooking(true)} className="shrink-0 gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New booking
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {showGettingStarted ? (
            <GettingStartedPanel
              settings={settings}
              jobs={jobs}
              loading={loadingSettings || loadingPortal}
              onBook={() => setShowBooking(true)}
              onDismiss={() => setShowGettingStarted(false)}
            />
          ) : null}
          <MyJobsCard
            jobs={jobs}
            isLoading={loadingPortal}
            error={portalError}
            onRetry={refetchPortal}
            onOpenJob={setSelectedJob}
            onBook={() => setShowBooking(true)}
            jobLabelPlural={app.terminology.jobPlural}
          />
          <MyInvoicesCard
            invoices={invoices}
            userId={user.id}
            isLoading={loadingPortal}
            error={portalError}
            onRetry={refetchPortal}
            onChanged={() => qc.invalidateQueries({ queryKey: ["customerPortalOverview", user.id] })}
          />
          {portalOverview?.potentially_truncated ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
              Some older repairs, scooters, or invoices may not be shown. Contact the workshop if you need an older record.
            </p>
          ) : null}
          <MyRewardsCard userId={user.id} />
          <SupportCard />
        </div>
      </main>

      <CustomerJobModal
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        jobs={jobs}
        invoices={invoices}
        historyLoading={loadingPortal}
        historyError={portalError}
        onRetryHistory={refetchPortal}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ["customerPortalOverview", user?.id] });
          if (selectedJob?.id) qc.invalidateQueries({ queryKey: ["customerPortalJob", selectedJob.id] });
        }}
        userId={user?.id}
      />
      <CustomerBookingModal
        open={showBooking}
        onClose={() => setShowBooking(false)}
        user={user}
        profile={settings?.profile}
        profileLoading={loadingSettings}
        profileError={settingsError}
        onRetryProfile={refetchSettings}
        scooters={scooters}
        scootersLoading={loadingPortal}
        scootersError={portalError}
        onRetryScooters={refetchPortal}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["customerPortalOverview", user?.id] })}
        onManage={async (jobId) => {
          if (!jobId) {
            toast.error("The new booking does not have a job reference yet.");
            return;
          }
          try {
            const detail = await getCustomerPortalJob(jobId);
            setSelectedJob({
              ...detail.job,
              customer_name: portalOverview?.account?.name || "Your repair",
            });
            qc.setQueryData(["customerPortalJob", jobId], detail);
          } catch {
            toast.error("The booking was saved, but its details could not be opened.", { description: "Refresh My Account and try again." });
          }
        }}
      />
    </div>
    </>
  );
}
