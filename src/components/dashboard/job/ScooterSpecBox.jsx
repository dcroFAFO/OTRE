import React from "react";
import { Bike } from "lucide-react";

const SPEC_FIELDS = [
  ["battery_voltage", "Voltage"],
  ["battery_amperage", "Amperage"],
  ["battery_capacity_wh", "Capacity"],
  ["motor_power", "Motor"],
  ["wheel_size", "Wheel size"],
  ["tyre_type", "Tyre type"],
  ["charger_spec", "Charger"],
  ["max_speed", "Max speed"],
  ["weight_kg", "Weight"],
];

export default function ScooterSpecBox({ spec }) {
  if (!spec) return null;
  const rows = SPEC_FIELDS
    .map(([key, label]) => [label, key === "weight_kg" && spec[key] != null ? `${spec[key]} kg` : spec[key]])
    .filter(([, v]) => v != null && v !== "");

  if (rows.length === 0 && !spec.notes) return null;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
        <Bike className="h-3.5 w-3.5" /> Reference specs · {spec.make} {spec.model}
      </div>
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="text-xs">
              <span className="text-muted-foreground">{label}: </span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}
      {spec.notes && <p className="text-xs text-muted-foreground pt-1 border-t border-accent/20">{spec.notes}</p>}
    </div>
  );
}