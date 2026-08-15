import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import ScooterFormDialog from "@/components/portal/settings/ScooterFormDialog";
import { toast } from "sonner";
import { Archive, Bike, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared";
import { getSafeErrorMessage } from "@/lib/errors";

export default function ScootersCard({ scooters, onChanged }) {
  const [editing, setEditing] = useState(null); // null | {} (new) | scooter
  const [deletingId, setDeletingId] = useState(null);

  const remove = async (scooter) => {
    const name = [scooter.make, scooter.model].filter(Boolean).join(" ") || "this scooter";
    const prompt = scooter.has_jobs
      ? `Archive ${name}? It will no longer appear in active scooter lists, but its service history will be retained.`
      : `Remove ${name}? This permanently deletes the scooter.`;
    if (!window.confirm(prompt)) return;
    setDeletingId(scooter.id);
    try {
      const action = scooter.has_jobs ? "archiveScooter" : "deleteScooter";
      const res = await base44.functions.invoke("customerSettings", { action, scooter_id: scooter.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(scooter.has_jobs ? "Scooter archived" : "Scooter removed", scooter.has_jobs ? { description: "Your service history has been retained." } : undefined);
      onChanged?.();
    } catch (err) {
      toast.error(getSafeErrorMessage(err, "This scooter could not be removed. Please try again."));
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
        {scooters.length === 0 ? (
          <EmptyState compact className="rounded-lg border border-dashed border-border" icon={Bike} title="No scooters saved yet" description="Add a scooter to make future bookings faster." />
        ) : null}
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
              <Button
                type="button"
                variant="ghost"
                size="iconTouch"
                onClick={() => remove(s)}
                disabled={deletingId === s.id}
                aria-label={s.has_jobs ? "Archive scooter and retain service history" : "Remove scooter permanently"}
                title={s.has_jobs ? "Archive scooter; service history is retained" : "Permanently remove unlinked scooter"}
                className="text-destructive hover:text-destructive"
              >
                {deletingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : s.has_jobs ? <Archive className="h-4 w-4" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              </Button>
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
