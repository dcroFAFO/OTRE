import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardSkeleton, ErrorState, FieldShell } from "@/components/shared";
import { getSafeErrorMessage } from "@/lib/errors";

const SLUG = "otr-scooters";
const KEY = "default_pricing";

export default function DefaultPricingCard() {
  const queryClient = useQueryClient();
  const pricingQuery = useQuery({
    queryKey: ["defaultPricing"],
    queryFn: async () => (await base44.entities.BusinessSetting.filter({ key: KEY }, "", 1))[0] || null,
  });
  const setting = pricingQuery.data;
  const [labourRate, setLabourRate] = useState("80");
  const [markup, setMarkup] = useState("20");
  const [minHours, setMinHours] = useState("1");
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (setting?.value) {
      setLabourRate(String(setting.value.labour_rate ?? 80));
      setMarkup(String(setting.value.parts_markup_percentage ?? 20));
      setMinHours(String(setting.value.minimum_labour_hours ?? 1));
    }
  }, [setting]);

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    const values = {
      labour_rate: Number(labourRate),
      parts_markup_percentage: Number(markup),
      minimum_labour_hours: Number(minHours),
    };
    const nextErrors = /** @type {Record<string, string>} */ ({});
    if (!Number.isFinite(values.labour_rate) || values.labour_rate < 0) nextErrors.labourRate = "Enter a labour rate of zero or more.";
    if (!Number.isFinite(values.parts_markup_percentage) || values.parts_markup_percentage < 0) nextErrors.markup = "Enter a markup of zero or more.";
    if (!Number.isFinite(values.minimum_labour_hours) || values.minimum_labour_hours < 0) nextErrors.minHours = "Enter minimum hours of zero or more.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(`default-pricing-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      if (setting) await base44.entities.BusinessSetting.update(setting.id, { value: values });
      else await base44.entities.BusinessSetting.create({ business_slug: SLUG, key: KEY, value: values, description: "Default service pricing", active: true });
      await queryClient.invalidateQueries({ queryKey: ["defaultPricing"] });
      toast.success("Default pricing saved");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Default pricing could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  if (pricingQuery.isLoading) return <CardSkeleton className="min-h-48" />;
  if (pricingQuery.error && pricingQuery.data === undefined) return <ErrorState title="Default pricing could not be loaded" error={pricingQuery.error} onRetry={pricingQuery.refetch} />;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm" aria-labelledby="default-pricing-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-accent" aria-hidden="true" />
          <h2 id="default-pricing-heading" className="font-heading font-bold">Default service pricing</h2>
        </div>
        {pricingQuery.isFetching ? <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status"><RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Refreshing</span> : null}
      </div>
      {pricingQuery.error ? <ErrorState className="mt-4" title="Latest default pricing could not be loaded" description="Previously loaded values remain available." error={pricingQuery.error} onRetry={pricingQuery.refetch} /> : null}
      <form onSubmit={save} className="mt-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldShell id="default-pricing-labourRate" label="Labour rate ($/hr)" error={errors.labourRate}>
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={labourRate} onChange={(event) => { setLabourRate(event.target.value); setErrors((current) => ({ ...current, labourRate: "" })); }} />
          </FieldShell>
          <FieldShell id="default-pricing-markup" label="Parts markup (%)" error={errors.markup}>
            <Input type="number" min="0" step="0.01" inputMode="decimal" value={markup} onChange={(event) => { setMarkup(event.target.value); setErrors((current) => ({ ...current, markup: "" })); }} />
          </FieldShell>
          <FieldShell id="default-pricing-minHours" label="Minimum labour (hrs)" error={errors.minHours}>
            <Input type="number" min="0" step="0.5" inputMode="decimal" value={minHours} onChange={(event) => { setMinHours(event.target.value); setErrors((current) => ({ ...current, minHours: "" })); }} />
          </FieldShell>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit" size="touch" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {saving ? "Saving pricing..." : "Save pricing"}
          </Button>
        </div>
      </form>
    </section>
  );
}
