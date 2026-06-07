import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical, Package, ClipboardList, Wrench, X, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["tyre", "brake", "battery", "service", "electrical", "other"];
const CATEGORY_COLORS = {
  tyre: "bg-blue-100 text-blue-700",
  brake: "bg-rose-100 text-rose-700",
  battery: "bg-amber-100 text-amber-700",
  service: "bg-emerald-100 text-emerald-700",
  electrical: "bg-purple-100 text-purple-700",
  other: "bg-slate-100 text-slate-600",
};

const EMPTY = {
  name: "", category: "service", issue_description: "", job_type: "service",
  checklist: [], parts_required: [], active: true, order: 0, business_slug: "otr-scooters",
};

export default function Templates() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // null | template object (new has no id)
  const [deleting, setDeleting] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["jobTemplates"],
    queryFn: () => base44.entities.JobTemplate.list("order", 100),
    staleTime: 2 * 60 * 1000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["jobTemplates"] });

  const handleSave = async (data) => {
    if (data.id) {
      await base44.entities.JobTemplate.update(data.id, data);
    } else {
      await base44.entities.JobTemplate.create(data);
    }
    refresh();
    setEditing(null);
  };

  const handleDelete = async () => {
    await base44.entities.JobTemplate.delete(deleting.id);
    refresh();
    setDeleting(null);
  };

  const toggleActive = async (t) => {
    await base44.entities.JobTemplate.update(t.id, { active: !t.active });
    refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Job Templates</h1>
          <p className="text-muted-foreground text-sm">Pre-fill common repairs to speed up job creation.</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ ...EMPTY })} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center space-y-3">
          <Wrench className="h-9 w-9 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No templates yet.</p>
          <Button size="sm" variant="outline" onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4 mr-1" /> Create your first template
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => setEditing({ ...t })}
              onDelete={() => setDeleting(t)}
              onToggle={() => toggleActive(t)}
            />
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor
          template={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete template?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">"{deleting?.name}" will be permanently removed.</p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({ template: t, onEdit, onDelete, onToggle }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 flex flex-col gap-3 transition-opacity", !t.active && "opacity-50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{t.name}</span>
            {t.category && (
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", CATEGORY_COLORS[t.category] || CATEGORY_COLORS.other)}>
                {t.category}
              </span>
            )}
          </div>
          {t.issue_description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.issue_description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {t.parts_required?.length > 0 && (
          <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{t.parts_required.length} part{t.parts_required.length !== 1 ? "s" : ""}</span>
        )}
        {t.checklist?.length > 0 && (
          <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{t.checklist.length} checks</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 pt-1 border-t border-border mt-auto">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 text-muted-foreground" onClick={onToggle}>
          {t.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          {t.active ? "Disable" : "Enable"}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 text-rose-500 hover:text-rose-600 ml-auto" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function TemplateEditor({ template, onSave, onClose }) {
  const [data, setData] = useState(template);
  const [saving, setSaving] = useState(false);
  const [newPart, setNewPart] = useState({ name: "", qty: 1, status: "needed" });
  const [newCheck, setNewCheck] = useState("");

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const addPart = () => {
    if (!newPart.name.trim()) return;
    set("parts_required", [...(data.parts_required || []), { ...newPart }]);
    setNewPart({ name: "", qty: 1, status: "needed" });
  };

  const removePart = (i) => set("parts_required", data.parts_required.filter((_, idx) => idx !== i));

  const addCheck = () => {
    if (!newCheck.trim()) return;
    set("checklist", [...(data.checklist || []), { label: newCheck.trim(), done: false }]);
    setNewCheck("");
  };

  const removeCheck = (i) => set("checklist", data.checklist.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    await onSave(data);
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{data.id ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Template name <span className="text-destructive">*</span></Label>
              <Input value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Front Tyre Change" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={data.category || "other"} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sort order</Label>
              <Input type="number" value={data.order || 0} onChange={(e) => set("order", Number(e.target.value))} className="w-full" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Default issue description</Label>
              <Textarea
                value={data.issue_description || ""}
                onChange={(e) => set("issue_description", e.target.value)}
                placeholder="Describe the typical repair or service..."
                rows={2}
              />
            </div>
          </div>

          {/* Parts required */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> Parts Required
            </Label>
            <div className="space-y-1.5">
              {(data.parts_required || []).map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                  <span className="flex-1">{p.name}</span>
                  <span className="text-muted-foreground text-xs">×{p.qty}</span>
                  <button onClick={() => removePart(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newPart.name}
                onChange={(e) => setNewPart((p) => ({ ...p, name: e.target.value }))}
                placeholder="Part name"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addPart()}
              />
              <Input
                type="number"
                value={newPart.qty}
                onChange={(e) => setNewPart((p) => ({ ...p, qty: Number(e.target.value) }))}
                className="w-16"
                min={1}
              />
              <Button size="sm" variant="outline" onClick={addPart} disabled={!newPart.name.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> Checklist Items
            </Label>
            <div className="space-y-1.5">
              {(data.checklist || []).map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                  <span className="flex-1">{c.label}</span>
                  <button onClick={() => removeCheck(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newCheck}
                onChange={(e) => setNewCheck(e.target.value)}
                placeholder="e.g. Check tyre pressure after fitting"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addCheck()}
              />
              <Button size="sm" variant="outline" onClick={addCheck} disabled={!newCheck.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!data.name.trim() || saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}