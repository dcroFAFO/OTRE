import React from "react";
import { Check } from "lucide-react";

const STEPS = ["Your Details", "Scooter & Issue"];

export default function BookingStepIndicator({ step }) {
  return (
    <div className="flex items-center justify-between mb-4">
      {STEPS.map((label, i) => {
        const index = i + 1;
        const active = index === step;
        const complete = index < step;
        return (
          <div key={label} className="flex-1 flex items-center">
            <div className="flex flex-col items-center gap-1 flex-1">
              <span
                className={
                  "grid h-7 w-7 place-items-center rounded-full text-xs font-bold border-2 transition-colors " +
                  (complete
                    ? "bg-accent border-accent text-accent-foreground"
                    : active
                    ? "border-accent text-accent"
                    : "border-border text-muted-foreground")
                }
              >
                {complete ? <Check className="h-3.5 w-3.5" /> : index}
              </span>
              <span className={"text-[11px] font-medium text-center " + (active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </div>
            {index < STEPS.length && <div className={"h-0.5 flex-1 -mt-4 " + (complete ? "bg-accent" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}