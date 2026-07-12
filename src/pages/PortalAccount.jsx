import React, { useState } from "react";
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
import CustomerJobModal from "@/components/portal/CustomerJobModal";
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

  const seo = <SEO title="My Account | On The Run Electrics" description="Your rides, jobs, invoices, referrals, and account details in one place." canonical="/portal/account" noindex />;

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

  return (
    <>
    {seo}
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><span className="grid place-items-center h-8 w-8 rounded-lg bg-accent/15 text-accent"><Zap className="h-4 w-4" /></span><span className="font-heading font-extrabold">{business.name}</span></Link>
          <button onClick={() => base44.auth.logout()} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/portal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to portal</Link>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">My Account</h1>
        <p className="text-muted-foreground text-sm">Your rides, {app.terminology.jobPlural}, invoices, referrals, and account details.</p>

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
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        userEmail={user?.email}
      />
    </div>
    </>
  );
}
