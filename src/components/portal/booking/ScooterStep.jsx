import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import { Bike, Plus, Loader2 } from "lucide-react";

export default function ScooterStep({ data, update }) {
  const { data: scooters = [], isLoading } = useQuery({
    queryKey: ["myScooters"],
    queryFn: () => base44.entities.Scooter.list("-updated_date", 50),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Which scooter is this booking for?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {scooters.map((s) => {
          const selected = data.scooter?.id === s.id;
          return (
            <button key={s.id} type="button" onClick={() => update({ scooter: s, addingNew: false })}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}>
              <Bike className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? "text-accent" : "text-muted-foreground"}`} />
              <span>
                <span className="block text-sm font-semibold">{[s.make, s.model].filter(Boolean).join(" ") || "Scooter"}</span>
                {s.serial_number && <span className="block text-xs text-muted-foreground">SN {s.serial_number}</span>}
              </span>
            </button>
          );
        })}
        <button type="button" onClick={() => update({ scooter: null, addingNew: true })}
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