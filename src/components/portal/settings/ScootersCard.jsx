import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import ScooterFormDialog from "@/components/portal/settings/ScooterFormDialog";
import { toast } from "sonner";
import { Bike, Plus, Pencil, Trash2, Loader2, Lock } from "lucide-react";

export default function ScootersCard({ scooters, onChanged }) {
  const [editing, setEditing] = useState(null); // null | {} (new) | scooter
  const [deletingId, setDeletingId] = useState(null);

  const remove = async (scooter) => {
    setDeletingId(scooter.id);
    try {
      const res = await base44.functions.invoke("customerSettings", { action: "deleteScooter", scooter_id: scooter.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Scooter removed");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Couldn't remove this scooter.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent"><Bike className="h-4.5 w-4.5" /></span>
          <div>
            <h2 className="font-heading text-lg font-extrabold">Your scooters</h2>
            <p className="text-xs text-muted-foreground">Saved scooters make future bookings faster.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setEditing({})} className="gap-1.5 rounded-xl"><Plus className="h-4 w-4" /> Add scooter</Button>
      </div>

      <div className="mt-4 space-y-2">
        {scooters.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No scooters saved yet.</p>
        )}
        {scooters.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{[s.make, s.model].filter(Boolean).join(" ") || "Scooter"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[s.colour, s.serial_number && `Serial ${s.serial_number}`].filter(Boolean).join(" · ") || "No extra details"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label="Edit scooter"><Pencil className="h-4 w-4" /></Button>
              {s.has_jobs ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground" title="Linked to past repair jobs — kept for your service history.">
                  <Lock className="h-3 w-3" /> Kept for history
                </span>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => remove(s)} disabled={deletingId === s.id} aria-label="Remove scooter" className="text-destructive hover:text-destructive">
                  {deletingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ScooterFormDialog
        open={editing !== null}
        scooter={editing?.id ? editing : null}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); onChanged?.(); }}
      />
    </section>
  );
}