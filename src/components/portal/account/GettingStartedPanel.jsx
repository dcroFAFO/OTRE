import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ListChecks, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/shared";
import { getSafeErrorMessage } from "@/lib/errors";

/**
 * @param {{
 *  settings?: Record<string, any>,
 *  jobs?: Array<Record<string, any>>,
 *  loading?: boolean,
 *  onBook: () => void,
 *  onDismiss: () => void
 * }} props
 */
export default function GettingStartedPanel({ settings, jobs = [], loading = false, onBook, onDismiss }) {
  const { checkUserAuth } = useAuth();
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState("");
  const profile = settings?.profile;
  const steps = [
    {
      label: "Confirm your contact details",
      description: "Keep your phone number current for repair updates.",
      complete: !!(profile?.name && profile?.phone_e164),
      action: <Button asChild type="button" variant="outline" size="sm"><Link to="/portal/settings">Open settings</Link></Button>,
    },
    {
      label: "Add your scooter",
      description: "Saved scooters make future repair bookings faster.",
      complete: !!settings?.scooters?.length,
      action: <Button asChild type="button" variant="outline" size="sm"><Link to="/portal/settings">Add scooter</Link></Button>,
    },
    {
      label: "Book your first repair",
      description: "Tell the workshop what your scooter needs.",
      complete: jobs.length > 0,
      action: <Button type="button" variant="outline" size="sm" onClick={onBook}>New booking</Button>,
    },
  ];
  const completeCount = steps.filter((step) => step.complete).length;

  const dismiss = async () => {
    if (dismissing) return;
    setDismissing(true);
    setError("");
    try {
      await base44.auth.updateMe({ hasSeenCustomerPortalTutorial: true });
      await checkUserAuth();
      onDismiss();
    } catch (caught) {
      setError(getSafeErrorMessage(caught, "The setup guide could not be dismissed. Please try again."));
    } finally {
      setDismissing(false);
    }
  };

  if (loading) return <CardSkeleton label="Loading your getting started checklist" />;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="getting-started-title">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ListChecks className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <h2 id="getting-started-title" className="font-heading text-lg font-extrabold">Getting started</h2>
            <p className="text-xs text-muted-foreground">{completeCount} of {steps.length} account steps complete</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => void dismiss()} disabled={dismissing} aria-label="Dismiss getting started checklist">
          {dismissing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>

      {error ? <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert> : null}

      <ol className="mt-4 divide-y divide-border rounded-lg border border-border bg-background">
        {steps.map((step) => (
          <li key={step.label} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {step.complete
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <div>
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {!step.complete ? <div className="pl-8 sm:pl-0">{step.action}</div> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

