import React from "react";
import { Wrench, Bike } from "lucide-react";
import JobCard from "@/components/shared/JobCard";

// Reuses the same JobCard used on the main portal jobs list — no
// duplicate job rendering logic.
export default function MyJobsCard({ jobs, onOpenJob, jobLabelPlural = "jobs" }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent"><Wrench className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="font-heading text-lg font-extrabold">Repairs</h2>
          <p className="text-xs text-muted-foreground">Your current and recent {jobLabelPlural}.</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {jobs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Bike className="h-7 w-7 mx-auto mb-2 opacity-40" />
            No {jobLabelPlural} yet — book a repair to see it here.
          </div>
        )}
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} onClick={() => onOpenJob(j)} compact />
        ))}
      </div>
    </section>
  );
}