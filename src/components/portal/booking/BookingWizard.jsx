import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import ScooterStep from "@/components/portal/booking/ScooterStep";
import ServiceStep from "@/components/portal/booking/ServiceStep";
import NotesStep from "@/components/portal/booking/NotesStep";
import ReviewStep from "@/components/portal/booking/ReviewStep";

const STEPS = ["Scooter", "Service", "Details", "Review"];

export default function BookingWizard({ user, profile, scooters = [], scootersLoading = false, scootersError, onRetryScooters, submitting, onSubmit }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    scooter: null,
    addingNew: false,
    newScooter: { make: "", model: "", customMake: "", customModel: "", label: "" },
    service: "",
    customIssue: "",
    notes: "",
    phone: "",
    preferredDate: "",
    preferredDateValid: true,
  });
  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  const scooterLabel = data.scooter ? [data.scooter.make, data.scooter.model].filter(Boolean).join(" ") : (data.newScooter.label || "");
  const isOther = data.service === "Other";
  const stepValid = [
    !!scooterLabel.trim(),
    !!data.service && (!isOther || !!data.customIssue.trim()),
    data.preferredDateValid !== false,
    !!(profile?.phone_e164 || data.phone.trim()),
  ][step];

  return (
    <div className="space-y-5 pt-1">
      <div className="flex items-start gap-2" aria-label={`Booking progress: step ${step + 1} of ${STEPS.length}`} role="list">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1" role="listitem" aria-current={i === step ? "step" : undefined}>
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-secondary"}`} />
            <p className={`mt-1 text-[11px] font-semibold ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
          </div>
        ))}
      </div>

        <h2 className="sr-only" tabIndex={-1}>Step {step + 1}: {STEPS[step]}</h2>
        {step === 0 && (
          <ScooterStep
            data={data}
            update={update}
            scooters={scooters}
            isLoading={scootersLoading}
            error={scootersError}
            onRetry={onRetryScooters}
          />
        )}
      {step === 1 && <ServiceStep data={data} update={update} />}
      {step === 2 && <NotesStep data={data} update={update} />}
      {step === 3 && <ReviewStep data={data} update={update} user={user} profile={profile} scooterLabel={scooterLabel} />}

      <div className="flex justify-between pt-1">
        <Button type="button" variant="outline" size="touch" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0 || submitting}>Back</Button>
        {step < 3 ? (
          <Button type="button" size="touch" onClick={() => setStep((s) => Math.min(s + 1, 3))} disabled={!stepValid} className="bg-primary text-primary-foreground hover:bg-primary/90">Next</Button>
        ) : (
          <Button type="button" size="touch" onClick={() => onSubmit(data, scooterLabel)} disabled={!stepValid || submitting} className="bg-primary text-primary-foreground hover:bg-primary/90" aria-busy={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
          </Button>
        )}
      </div>
    </div>
  );
}
