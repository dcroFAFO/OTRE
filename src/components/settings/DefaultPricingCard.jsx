import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

const SLUG = "otr-scooters";
const KEY = "default_pricing";

export default function DefaultPricingCard() {
  const qc = useQueryClient();
  const { data: setting } = useQuery({
    queryKey: ["defaultPricing"],
    queryFn: async () => (await base44.entities.BusinessSetting.filter({ key: KEY }, "", 1))[0] || null,
  });
  const [labourRate, setLabourRate] = useState("80");
  const [markup, setMarkup] = useState("20");
  const [minHours, setMinHours] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (setting?.value) {
      setLabourRate(String(setting.value.labour_rate ?? 80));
      setMarkup(String(setting.value.parts_markup_percentage ?? 20));
      setMinHours(String(setting.value.minimum_labour_hours ?? 1));
    }
  }, [setting]);

  const save = async () => {
    setSaving(true);
    const value = {
      labour_rate: Number(labourRate) || 0,
      parts_markup_percentage: Number(markup) || 0,
      minimum_labour_hours: Number(minHours) || 0,
    };
    if (setting) {
      await base44.entities.BusinessSetting.update(setting.id, { value });
    } else {
      await base44.entities.BusinessSetting.create({ business_slug: SLUG, key: KEY, value, description: "Default service pricing", active: true });
    }
    qc.invalidateQueries({ queryKey: ["defaultPricing"] });
    setSaving(false);
    toast.success("Default pricing saved");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-accent" />
        <h2 className="font-heading font-bold">Default Service Pricing</h2>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Labour rate ($/hr)</Label>
          <Input type="number" min="0" value={labourRate} onChange={(e) => setLabourRate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Parts markup (%)</Label>
          <Input type="number" min="0" value={markup} onChange={(e) => setMarkup(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Minimum labour (hrs)</Label>
          <Input type="number" min="0" step="0.5" value={minHours} onChange={(e) => setMinHours(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save pricing"}</Button>
      </div>
    </div>
  );
}