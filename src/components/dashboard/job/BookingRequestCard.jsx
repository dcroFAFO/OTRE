import React from "react";
import { CalendarClock, Clock, Bike, MessageSquare, AlertTriangle, Zap } from "lucide-react";
import { format } from "date-fns";
import ServiceTypeBadge from "@/components/shared/ServiceTypeBadge";
import { timeWindowLabel } from "@/config/timeWindows";

function formatRequestedDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return isNaN(parsed) ? value : format(parsed, "EEEE d MMM yyyy");
}

/**
 * Read-only summary of what the customer actually asked for at booking time.
 * Sourced from Job.booking_submission, with fallbacks to the job's own fields
 * for staff-created jobs that have no booking snapshot.
 */
export default function BookingRequestCard({ job }) {
  const booking = job.booking_submission || {};
  const requestedDate = formatRequestedDate(booking.preferredDate || job.scheduled_date);
  const requestedWindow = timeWindowLabel(booking.preferredTimeWindow || job.preferred_time_window);
  const isAsap = !!booking.asap || /asap/i.test(booking.preferredTimeWindow || job.preferred_time_window || "");
  const notes = booking.issueDescription || booking.issueOrService || job.issue_description || "";
  const safetyNotes = booking.urgencyOrSafetyNotes || "";
  const rideable = booking.rideableStatus || job.rideable_status || "";
  const submittedAt = booking.submittedAt || job.created_at || job.createdAt;
  const isCustomerBooking = job.source === "public_booking";

  return (
    <section className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-heading text-sm font-extrabold">
          <CalendarClock className="h-4 w-4 text-accent" />
          {isCustomerBooking ? "Customer request" : "Job request"}
        </h3>
        <ServiceTypeBadge job={job} />
      </div>

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Detail icon={CalendarClock} label="Requested date" value={isAsap && !requestedDate ? "As soon as possible" : requestedDate || "No preference given"} />
        <Detail icon={Clock} label="Requested time" value={requestedWindow || (isAsap ? "ASAP / any time" : "No preference given")} />
        {rideable && <Detail icon={Bike} label="Rideable" value={rideable} />}
        {submittedAt && (
          <Detail
            icon={Zap}
            label="Requested on"
            value={format(new Date(submittedAt), "d MMM yyyy, h:mm a")}
          />
        )}
      </dl>

      {notes && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <MessageSquare className="h-3 w-3" /> Booking notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{notes}</p>
        </div>
      )}

      {safetyNotes && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="whitespace-pre-wrap">{safetyNotes}</p>
        </div>
      )}
    </section>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}