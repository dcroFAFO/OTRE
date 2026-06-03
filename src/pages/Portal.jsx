import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Zap, ArrowLeft, Bike } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { DEFAULT_BUSINESS } from "@/config/businessConfig";
import JobCard from "@/components/shared/JobCard";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";

export default function Portal() {
  const { user, isLoading } = useCurrentUser();
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!user) return;
    base44.entities.Job.filter({ customer_email: user.email, archived: false }, "-created_date", 100).then(setJobs);
  }, [user]);

  if (isLoading) return <Spinner />;

  if (!user) {
    return (
      <Centered>
        <h1 className="font-heading text-2xl font-extrabold">Customer Portal</h1>
        <p className="mt-2 text-muted-foreground">Sign in to view and track your scooter repairs.</p>
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
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><span className="grid place-items-center h-8 w-8 rounded-lg bg-primary text-primary-foreground"><Zap className="h-4 w-4 text-accent" /></span><span className="font-heading font-extrabold">{DEFAULT_BUSINESS.name}</span></Link>
          <button onClick={() => base44.auth.logout(window.location.origin)} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to site</Link>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Your repairs</h1>
        <p className="text-muted-foreground text-sm">Track progress and approve quotes for your scooters.</p>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {jobs.map((j) => <JobCard key={j.id} job={j} onClick={() => setSelectedId(j.id)} />)}
          {jobs.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <Bike className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No repairs yet. <Link to="/#book" className="text-accent font-medium">Book one →</Link>
            </div>
          )}
        </div>
      </main>

      <JobDetailModal jobId={selectedId} actor={{ ...user, role: "customer" }} open={!!selectedId} onClose={() => setSelectedId(null)} onChange={() => base44.entities.Job.filter({ customer_email: user.email, archived: false }, "-created_date", 100).then(setJobs)} />
    </div>
  );
}

function Spinner() {
  return <div className="fixed inset-0 grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" /></div>;
}
function Centered({ children }) {
  return <div className="min-h-screen grid place-items-center bg-secondary/30 px-5"><div className="rounded-3xl border border-border bg-card p-10 text-center max-w-md">{children}</div></div>;
}