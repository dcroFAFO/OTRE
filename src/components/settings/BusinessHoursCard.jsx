import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function BusinessHoursCard() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["businessProfileDefault"],
    queryFn: async () => (await base44.entities.BusinessProfile.filter({ is_default: true }, "", 1))[0] || null,
  });
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (profile) setRows(profile.opening_hours || []); }, [profile]);

  const setRow = (i, k, v) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    await base44.entities.BusinessProfile.update(profile.id, { opening_hours: rows });
    qc.invalidateQueries({ queryKey: ["businessProfileDefault"] });
    qc.invalidateQueries({ queryKey: ["platformConfig"] });
    setSaving(false);
    toast.success("Business hours saved");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-accent" />
        <h2 className="font-heading font-bold">Business Hours</h2>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={row.day} onChange={(e) => setRow(i, "day", e.target.value)} placeholder="Mon – Fri" className="flex-1" />
            <Input value={row.hours} onChange={(e) => setRow(i, "hours", e.target.value)} placeholder="9:00 — 17:30" className="flex-1" />
            <button onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setRows((r) => [...r, { day: "", hours: "" }])}>
          <Plus className="h-4 w-4 mr-1" /> Add row
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !profile}>{saving ? "Saving…" : "Save hours"}</Button>
      </div>
    </div>
  );
}