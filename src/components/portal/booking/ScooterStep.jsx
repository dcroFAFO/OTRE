import React from "react";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import { Bike, Plus, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScooterStep({ data, update, scooters = [], isLoading = false, error, onRetry }) {
  if (isLoading) return <div className="flex justify-center gap-2 py-10 text-sm text-muted-foreground" role="status"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading saved scooters</div>;

  if (error) return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
      <p className="text-sm font-semibold text-destructive">Saved scooters could not be loaded.</p>
      <p className="mt-1 text-sm text-muted-foreground">Retry before continuing so this booking is linked to the correct scooter.</p>
      <Button type="button" size="touch" variant="outline" className="mt-3" onClick={onRetry}><RefreshCw aria-hidden="true" /> Retry</Button>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Which scooter is this booking for?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {scooters.map((s) => {
          const selected = data.scooter?.id === s.id;
          return (
            <button key={s.id} type="button" aria-pressed={selected} onClick={() => update({ scooter: s, addingNew: false })}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}>
              <Bike className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? "text-accent" : "text-muted-foreground"}`} />
              <span>
                <span className="block text-sm font-semibold">{[s.make, s.model].filter(Boolean).join(" ") || "Scooter"}</span>
                {s.serial_number && <span className="block text-xs text-muted-foreground">SN {s.serial_number}</span>}
              </span>
            </button>
          );
        })}
        <button type="button" aria-pressed={data.addingNew} onClick={() => update({ scooter: null, addingNew: true })}
          className={`flex items-center gap-3 rounded-xl border border-dashed p-3 text-left text-sm font-semibold transition ${data.addingNew ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/50"}`}>
          <Plus className="h-5 w-5" /> Add a new scooter
        </button>
      </div>
      {(data.addingNew || scooters.length === 0) && (
        <div className="pt-1">
          <AssetBrandPicker
            make={data.newScooter.make}
            model={data.newScooter.model}
            customMake={data.newScooter.customMake}
            customModel={data.newScooter.customModel}
            onChange={({ make, model, customMake, customModel, label }) => update({ scooter: null, addingNew: true, newScooter: { make, model, customMake, customModel, label } })}
          />
        </div>
      )}
    </div>
  );
}
