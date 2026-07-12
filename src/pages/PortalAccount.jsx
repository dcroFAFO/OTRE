import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, ArrowLeft, Loader2, Plus } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import SEO from "@/components/SEO";
import AccountDetailsCard from "@/components/portal/settings/AccountDetailsCard";
import ScootersCard from "@/components/portal/settings/ScootersCard";
import CustomerJobModal from "@/components/portal/CustomerJobModal";
import CustomerBookingModal from "@/components/portal/CustomerBookingModal";
import PortalTutorial from "@/components/portal/tutorial/PortalTutorial";
import { Button } from "@/components/ui/button";
import MyJobsCard from "@/components/portal/account/MyJobsCard";
import MyInvoicesCard from "@/components/portal/account/MyInvoicesCard";
import MyReferralsCard from "@/components/portal/account/MyReferralsCard";
import SupportCard from "@/components/portal/account/SupportCard";

// Central customer dashboard. Reuses existing customerSettings (profile +
// scooters), Job/Invoice entities, and the same components used on the
// portal jobs list and settings page — no duplicate customer/job/invoice
// records or logic are introduced here.
export default function PortalAccount() {
  const { user, isLoading } = useCurrentUser();
  const { data: { business, app } } = usePlatformConfig();
  const [selectedJob, setSelectedJob] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user || isStaff(user.role)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("book") === "1") setShowBooking(true);
  }, [user]);

  const { data: settings, isLoading: loadingSettings, refetch } = useQuery({
    queryKey: ["customerSettings", user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("customerSettings", { action: "get" });
      return res.data;
    },
    enabled: !!user && !isStaff(user.role),
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["portalJobs", user?.id],
    queryFn: () => base44.entities.Job.filter({ customer_user_id: user.id }, "-created_date", 50),
    enabled: !!user && !isStaff(user.role),
  });

  const seo = <SEO title="My Account | On The Run Electrics" description="Your rides, jobs, invoices, referrals, and account details in one place." canonical="/portal" noindex />;

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
          <p className="mt-2 text-muted-foreground">My Account is for customer accounts — manage customers from the dashboard.</p>
          <Link to="/dashboard" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Go to dashboard</Link>
        </div>
      </div>
      </>
    );
  }

  const busy = loadingSettings || loadingJobs;
  const tutorialActive = !busy && !showBooking && !user.hasSeenCustomerPortalTutorial && !tutorialDone;

  return (
    <>
    {seo}
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><span className="grid place-items-center h-8 w-8 rounded-lg bg-accent/15 text-accent"><Zap className="h-4 w-4" /></span><span className="font-heading font-extrabold">{business.name}</span></Link>
          <div className="flex items-center gap-4">
            <Link to="/portal/settings" className="text-sm text-muted-foreground hover:text-foreground">Settings</Link>
            <button onClick={() => base44.auth.logout()} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to site</Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">My Account</h1>
            <p className="text-sm text-muted-foreground">Your rides, {app.terminology.jobPlural}, invoices, referrals, and account details.</p>
          </div>
          <Button onClick={() => setShowBooking(true)} className="shrink-0 gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> New booking
          </Button>
        </div>

        {busy ? (
          <div className="mt-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="mt-6 space-y-5">
            <ScootersCard scooters={settings?.scooters || []} onChanged={refetch} />
            <MyJobsCard jobs={jobs} onOpenJob={setSelectedJob} jobLabelPlural={app.terminology.jobPlural} />
            <MyInvoicesCard userEmail={user.email} />
            <MyReferralsCard referral={settings?.referral} />
            <AccountDetailsCard profile={settings?.profile} onSaved={refetch} />
            <SupportCard />
          </div>
        )}
      </main>

      <CustomerJobModal
        job={selectedJob}
        open={!!selectedJob && !tutorialActive}
        onClose={() => setSelectedJob(null)}
        onUpdate={() => qc.invalidateQueries({ queryKey: ["portalJobs", user?.id] })}
        userEmail={user?.email}
      />
      <CustomerBookingModal
        open={showBooking}
        onClose={() => setShowBooking(false)}
        user={user}
        profile={settings?.profile}
        profileLoading={loadingSettings}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["portalJobs", user?.id] })}
        onManage={async (jobId) => {
          if (!jobId) return;
          const job = await base44.entities.Job.get(jobId).catch(() => null);
          if (job) setSelectedJob(job);
        }}
      />
      {tutorialActive && <PortalTutorial onDone={() => setTutorialDone(true)} />}
    </div>
    </>
  );
}