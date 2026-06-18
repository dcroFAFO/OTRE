import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, ArrowLeft, Bike, Plus } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import JobCard from "@/components/shared/JobCard";
import CustomerJobModal from "@/components/portal/CustomerJobModal";
import SupportChat from "@/components/portal/SupportChat";
import CustomerBookingModal from "@/components/portal/CustomerBookingModal";
import { Button } from "@/components/ui/button";

export default function Portal() {
  const { user, isLoading } = useCurrentUser();
  const { data: { business, app } } = usePlatformConfig();
  const [selectedJob, setSelectedJob] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const qc = useQueryClient();

  const { data: jobs = [] } = useQuery({
    queryKey: ["portalJobs", user?.email],
    queryFn: () => base44.entities.Job.filter({ customer_email: user.email }, "-created_date", 50),
    enabled: !!user && !isStaff(user.role),
  });

  if (isLoading) return <Spinner />;

  if (!user) {
    return (
      <Centered>
        <h1 className="font-heading text-2xl font-extrabold">{app.landing.portalLabel}</h1>
        <p className="mt-2 text-muted-foreground">Sign in to view and track your {app.terminology.jobPlural}.</p>
        <button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="mt-5 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-foreground">Sign in</button>
      </Centered>
    );
  }

  if (isStaff(user.role)) {
    return (
      <Centered>
        <h1 className="font-heading text-2xl font-extrabold">Welcome back, {user.full_name?.split(" ")[0]}</h1>
        <p className="mt-2 text-muted-foreground">You're a staff member — head to the dashboard.</p>
        <Link to="/dashboard" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Go to dashboard</Link>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><span className="grid place-items-center h-8 w-8 rounded-lg bg-accent/15 text-accent"><Zap className="h-4 w-4" /></span><span className="font-heading font-extrabold">{business.name}</span></Link>
          <button onClick={() => base44.auth.logout(window.location.origin)} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to site</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">Your {app.terminology.jobPlural}</h1>
            <p className="text-muted-foreground text-sm">Track progress and approve quotes online.</p>
          </div>
          <Button onClick={() => setShowBooking(true)} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> New booking
          </Button>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {jobs.map((j) => <JobCard key={j.id} job={j} onClick={() => setSelectedJob(j)} />)}
          {jobs.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <Bike className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No {app.terminology.jobPlural} yet.{" "}
              <button onClick={() => setShowBooking(true)} className="text-accent font-medium hover:underline">Book one →</button>
            </div>
          )}
        </div>
      </main>

      <CustomerJobModal job={selectedJob} open={!!selectedJob} onClose={() => setSelectedJob(null)} onUpdate={() => qc.invalidateQueries({ queryKey: ["portalJobs", user?.email] })} userEmail={user?.email} />
      <CustomerBookingModal open={showBooking} onClose={() => setShowBooking(false)} user={user} onSuccess={() => qc.invalidateQueries({ queryKey: ["portalJobs", user?.email] })} />

      <SupportChat user={user} />
    </div>
  );
}

function Spinner() {
  return <div className="fixed inset-0 grid place-items-center bg-background"><div className="h-8 w-8 rounded-full border-4 border-border border-t-accent animate-spin" /></div>;
}
function Centered({ children }) {
  return <div className="min-h-screen grid place-items-center bg-background px-5"><div className="rounded-3xl border border-border bg-card p-10 text-center max-w-md shadow-xl">{children}</div></div>;
}