import React from "react";
import { Wrench, Bike } from "lucide-react";
import JobCard from "@/components/shared/JobCard";
import { Button } from "@/components/ui/button";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared";

// Reuses the same JobCard used on the main portal jobs list — no
// duplicate job rendering logic.
export default function MyJobsCard({ jobs = [], isLoading = false, error, onRetry, onOpenJob, onBook, jobLabelPlural = "jobs" }) {
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
        {isLoading ? <CardSkeleton compact label={`Loading your ${jobLabelPlural}`} /> : null}
        {error ? <ErrorState title="Repairs could not be loaded" error={error} onRetry={onRetry} /> : null}
        {!isLoading && !error && jobs.length === 0 ? (
          <EmptyState
            compact
            className="rounded-lg border border-dashed border-border"
            icon={Bike}
            title={`No ${jobLabelPlural} yet`}
            description="Book a repair and its progress will appear here."
            action={onBook ? <Button type="button" size="sm" onClick={onBook}>Book a repair</Button> : undefined}
          />
        ) : null}
        {!isLoading && !error ? jobs.map((job) => (
          <JobCard key={job.id} job={job} onClick={() => onOpenJob(job)} compact />
        )) : null}
      </div>
    </section>
  );
}
