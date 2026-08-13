import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Loader2, Wrench, Package, ClipboardList, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import { EmptyState, ErrorState, LoadingSpinner } from "@/components/shared";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errors";

const CATEGORY_COLORS = {
  tyre: "bg-blue-100 text-blue-700",
  brake: "bg-rose-100 text-rose-700",
  battery: "bg-amber-100 text-amber-700",
  service: "bg-emerald-100 text-emerald-700",
  electrical: "bg-purple-100 text-purple-700",
  other: "bg-slate-100 text-slate-600",
};

export default function NewJobFromTemplateModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState("pick"); // pick | fill
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", asset_label: "" });
  const [asset, setAsset] = useState({ make: "", model: "", customMake: "", customModel: "" });
  const [busy, setBusy] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["jobTemplates"],
    queryFn: () => base44.entities.JobTemplate.filter({ active: true }, "order", 50),
    staleTime: 2 * 60 * 1000,
  });
  const templates = templatesQuery.data || [];

  const pick = (t) => { setSelected(t); setStep("fill"); };

  const submit = async () => {
    if (busy || !selected) return;
    setBusy(true);
    try {
      const job = await base44.entities.Job.create({
        ...form,
        issue_description: selected.issue_description || "",
        job_type: selected.job_type || "service",
        checklist: (selected.checklist || []).map((c) => ({ ...c, done: false })),
        parts_required: selected.parts_required || [],
        status: "requested",
        business_slug: "otr-scooters",
      });
      onCreated?.(job);
      handleClose();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "The job could not be created."));
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setStep("pick");
    setSelected(null);
    setForm({ customer_name: "", customer_phone: "", customer_email: "", asset_label: "" });
    setAsset({ make: "", model: "", customMake: "", customModel: "" });
    onClose();
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            {step === "pick" ? "New Job from Template" : `New Job · ${selected?.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === "pick" ? (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {templatesQuery.isLoading ? <LoadingSpinner label="Loading job templates" className="py-8" /> : null}
            {templatesQuery.error ? <ErrorState title="Job templates could not be loaded" error={templatesQuery.error} onRetry={templatesQuery.refetch} /> : null}
            {!templatesQuery.isLoading && !templatesQuery.error && templates.length === 0 ? <EmptyState title="No job templates yet" description="Create this job manually or add reusable templates before using this workflow." /> : null}
            {templates.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => pick(t)}
                className="group flex min-h-11 w-full items-start gap-3 rounded-lg border border-border p-3.5 text-left transition-all hover:border-primary/40 hover:bg-secondary/50"
              >
                <div className="p-2 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                  <Wrench className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{t.name}</span>
                    {t.category && (
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", CATEGORY_COLORS[t.category] || CATEGORY_COLORS.other)}>
                        {t.category}
                      </span>
                    )}
                  </div>
                  {t.issue_description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.issue_description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {t.parts_required?.length > 0 && (
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" />{t.parts_required.length} part{t.parts_required.length !== 1 ? "s" : ""}</span>
                    )}
                    {t.checklist?.length > 0 && (
                      <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" />{t.checklist.length} checks</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary mt-1 shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Template summary */}
            <div className="rounded-lg bg-secondary/60 border border-border p-3 text-sm space-y-1.5">
              {selected.issue_description && <p className="text-muted-foreground text-xs">{selected.issue_description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {selected.parts_required?.length > 0 && (
                  <span className="flex items-center gap-1"><Package className="h-3 w-3" />{selected.parts_required.map((p) => p.name).join(", ")}</span>
                )}
                {selected.checklist?.length > 0 && (
                  <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" />{selected.checklist.length} checklist items</span>
                )}
              </div>
            </div>

            {/* Customer details */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="template-job-customer-name" className="text-xs">Customer name <span className="text-destructive">*</span></Label>
                <Input id="template-job-customer-name" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="template-job-customer-phone" className="text-xs">Phone</Label>
                <Input id="template-job-customer-phone" type="tel" value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} placeholder="04xx xxx xxx" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="template-job-customer-email" className="text-xs">Email</Label>
                <Input id="template-job-customer-email" type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} placeholder="jane@email.com" />
              </div>
              <fieldset className="space-y-1 sm:col-span-2">
                <legend className="text-xs font-medium">Scooter / asset</legend>
                <AssetBrandPicker
                  make={asset.make}
                  model={asset.model}
                  customMake={asset.customMake}
                  customModel={asset.customModel}
                  onChange={({ label, ...rest }) => { setAsset(rest); set("asset_label", label); }}
                />
              </fieldset>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="button" variant="outline" size="touch" onClick={() => setStep("pick")} disabled={busy}>Back</Button>
              <Button
                type="button"
                size="touch"
                className="flex-1"
                disabled={!form.customer_name.trim() || busy}
                onClick={submit}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Job"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
