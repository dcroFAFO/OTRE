import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Loader2, Wrench, Package, ClipboardList, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_COLORS = {
  tyre: "bg-blue-100 text-blue-700",
  brake: "bg-rose-100 text-rose-700",
  battery: "bg-amber-100 text-amber-700",
  service: "bg-emerald-100 text-emerald-700",
  electrical: "bg-purple-100 text-purple-700",
  other: "bg-slate-100 text-slate-600",
};

export default function CreateJobModal({ open, onClose, onCreated }) {
  const [mode, setMode] = useState("blank"); // blank | template
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    asset_label: "",
    issue_description: "",
    job_type: "service",
  });
  const [asset, setAsset] = useState({ make: "", model: "", customMake: "", customModel: "" });
  const [busy, setBusy] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["jobTemplates"],
    queryFn: () => base44.entities.JobTemplate.filter({ active: true }, "order", 50),
    staleTime: 2 * 60 * 1000,
  });

  const selectTemplate = (t) => {
    setSelectedTemplate(t);
    setForm((f) => ({
      ...f,
      issue_description: t.issue_description || "",
      job_type: t.job_type || "service",
    }));
    setMode("blank");
  };

  const submit = async () => {
    setBusy(true);
    const job = await base44.entities.Job.create({
      ...form,
      checklist: (selectedTemplate?.checklist || []).map((c) => ({ ...c, done: false })),
      parts_required: selectedTemplate?.parts_required || [],
      status: "requested",
      business_slug: "otr-scooters",
    });
    setBusy(false);
    onCreated?.(job);
    handleClose();
  };

  const handleClose = () => {
    setMode("blank");
    setSelectedTemplate(null);
    setForm({ customer_name: "", customer_phone: "", customer_email: "", asset_label: "", issue_description: "", job_type: "service" });
    setAsset({ make: "", model: "", customMake: "", customModel: "" });
    onClose();
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            Create New Job
          </DialogTitle>
        </DialogHeader>

        {mode === "blank" ? (
          <div className="space-y-4">
            {/* Template selector */}
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Start from template</h4>
                <span className="text-xs text-muted-foreground">Optional — autofills issue details</span>
              </div>
              {templates.length === 0 ? (
                <p className="text-xs text-muted-foreground">No templates available</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className="text-left flex items-start gap-2 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-card transition-all group"
                    >
                      <div className="p-1.5 rounded-md bg-secondary group-hover:bg-primary/10 transition-colors">
                        <Wrench className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold truncate">{t.name}</span>
                          {t.category && (
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", CATEGORY_COLORS[t.category] || CATEGORY_COLORS.other)}>
                              {t.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          {t.parts_required?.length > 0 && (
                            <span className="flex items-center gap-0.5"><Package className="h-2.5 w-2.5" />{t.parts_required.length}</span>
                          )}
                          {t.checklist?.length > 0 && (
                            <span className="flex items-center gap-0.5"><ClipboardList className="h-2.5 w-2.5" />{t.checklist.length}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary mt-0.5 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Customer name <span className="text-destructive">*</span></Label>
                <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} placeholder="04xx xxx xxx" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} placeholder="jane@email.com" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Scooter / Asset</Label>
                <AssetBrandPicker
                  make={asset.make}
                  model={asset.model}
                  customMake={asset.customMake}
                  customModel={asset.customModel}
                  onChange={({ label, ...rest }) => { setAsset(rest); set("asset_label", label); }}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Issue description {selectedTemplate && <span className="text-muted-foreground">(from template)</span>}</Label>
                <Textarea
                  value={form.issue_description}
                  onChange={(e) => set("issue_description", e.target.value)}
                  placeholder="Describe the issue..."
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!form.customer_name.trim() || busy}
                onClick={submit}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileText className="h-4 w-4" /> Create Job</>}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}