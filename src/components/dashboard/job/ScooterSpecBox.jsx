import React from "react";
import { Bike, Pencil, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const SPEC_FIELDS = [
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

export default function ScooterSpecBox({ spec, editableSpec, onEditableSpecChange, onEditStart, onEditCancel, isEditing }) {
  if (!spec && !editableSpec) return null;

  const display = editableSpec || spec;

  const rows = SPEC_FIELDS
    .map(([key, label]) => [label, key, key === "weight_kg" && display[key] != null ? `${display[key]} kg` : display[key]])
    .filter(([, , v]) => isEditing || (v != null && v !== ""));

  if (!isEditing && rows.length === 0 && !display?.notes) return null;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Bike className="h-3.5 w-3.5" /> Reference specs · {display.make} {display.model}
        </div>
        {!isEditing && onEditStart && (
          <button
            onClick={onEditStart}
            className="flex items-center gap-1 text-xs text-accent hover:opacity-70 transition-opacity"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )}
        {isEditing && (
          <button onClick={onEditCancel} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="h-3 w-3" /> Cancel
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SPEC_FIELDS.map(([key, label]) => (
            <div key={key} className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <Input
                className="h-7 text-xs"
                value={editableSpec?.[key] ?? ""}
                onChange={(e) => onEditableSpecChange(key, e.target.value)}
                placeholder={label}
              />
            </div>
          ))}
          <div className="col-span-2 sm:col-span-3 space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Notes</span>
            <Input
              className="h-7 text-xs"
              value={editableSpec?.notes ?? ""}
              onChange={(e) => onEditableSpecChange("notes", e.target.value)}
              placeholder="Notes"
            />
          </div>
        </div>
      ) : (
        <>
          {rows.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
              {rows.map(([label, , value]) => (
                <div key={label} className="text-xs">
                  <span className="text-muted-foreground">{label}: </span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
          {display.notes && <p className="text-xs text-muted-foreground pt-1 border-t border-accent/20">{display.notes}</p>}
        </>
      )}
    </div>
  );
}