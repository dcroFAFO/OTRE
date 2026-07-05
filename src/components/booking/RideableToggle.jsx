import React from "react";
import { Bike, TruckIcon } from "lucide-react";

export default function RideableToggle({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={
          "flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors " +
          (value ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/40")
        }
      >
        <Bike className="h-4 w-4" /> Ready to Ride
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={
          "flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors " +
          (!value ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/40")
        }
      >
        <TruckIcon className="h-4 w-4" /> Needs Transport
      </button>
    </div>
  );
}