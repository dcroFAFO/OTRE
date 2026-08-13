import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CardSkeleton, ErrorState, FieldShell } from "@/components/shared";
import { DEFAULT_BUSINESS } from "@/config/platformConfig";
import { getSafeErrorMessage } from "@/lib/errors";
import { normalizePhoneToE164 } from "@/lib/phone";
import { toast } from "sonner";

/** @returns {Record<string, any>} */
const fallbackForm = () => ({
  name: DEFAULT_BUSINESS.name,
  legal_name: DEFAULT_BUSINESS.legalName,
  tagline: DEFAULT_BUSINESS.tagline,
  subheading: DEFAULT_BUSINESS.subheading,
  website_url: DEFAULT_BUSINESS.websiteUrl,
  email: DEFAULT_BUSINESS.email,
  invoice_sender_email: DEFAULT_BUSINESS.email,
  phone: DEFAULT_BUSINESS.phone,
  address: DEFAULT_BUSINESS.address,
  address_line_1: DEFAULT_BUSINESS.addressLine1,
  locality: DEFAULT_BUSINESS.locality,
  region: DEFAULT_BUSINESS.region,
  postcode: DEFAULT_BUSINESS.postcode,
  country: DEFAULT_BUSINESS.country,
  maps_url: "",
  abn: DEFAULT_BUSINESS.abn,
  timezone: DEFAULT_BUSINESS.timezone,
  opening_hours: DEFAULT_BUSINESS.openingHours.map((row) => ({ ...row })),
});

/** @param {any} profile @returns {Record<string, any>} */
function profileForm(profile) {
  const fallback = fallbackForm();
  if (!profile) return fallback;
  return Object.fromEntries(Object.entries(fallback).map(([key, value]) => [key, profile[key] ?? value]));
}

export default function BusinessProfileCard() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["businessProfileDefault"],
    queryFn: async () => (await base44.entities.BusinessProfile.filter({ is_default: true }, "-updated_date", 1))[0] || null,
  });
  const [form, setForm] = useState(/** @type {Record<string, any>} */ (fallbackForm()));
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isLoading) setForm(profileForm(profile)); }, [profile, isLoading]);

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const setHour = (index, key, value) => {
    setForm((current) => ({
      ...current,
      opening_hours: current.opening_hours.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row),
    }));
  };

  const save = async () => {
    if (saving) return;
    const nextErrors = /** @type {Record<string, string>} */ ({});
    if (!form.name.trim()) nextErrors.name = "Enter the public business name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Enter a valid public contact email.";
    const phone = normalizePhoneToE164(form.phone);
    if (!phone.is_valid) nextErrors.phone = "Enter a valid Australian mobile number.";
    if (!form.address.trim()) nextErrors.address = "Enter the workshop address.";
    if (!form.timezone.trim()) nextErrors.timezone = "Enter the business timezone.";
    if (!form.opening_hours.length || form.opening_hours.some((row) => !row.day?.trim() || !row.hours?.trim())) nextErrors.opening_hours = "Every opening-hours row needs days and hours.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(`business-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        is_default: true,
        phone_e164: phone.phone_e164,
        locations: [{ name: "Main Workshop", address: form.address.trim(), phone: form.phone.trim(), email: form.email.trim(), is_default: true }],
        opening_hours: form.opening_hours.map((row) => ({ day: row.day.trim(), hours: row.hours.trim(), opens: row.opens || "", closes: row.closes || "" })),
      };
      if (profile?.id) await base44.entities.BusinessProfile.update(profile.id, payload);
      else await base44.entities.BusinessProfile.create(payload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["businessProfileDefault"] }),
        queryClient.invalidateQueries({ queryKey: ["platformConfig"] }),
      ]);
      toast.success("Business profile saved", { description: "Public contact details and hours will refresh across the app." });
    } catch (saveError) {
      toast.error(getSafeErrorMessage(saveError, "Business details could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <CardSkeleton className="min-h-72" />;
  if (error && !profile) return <ErrorState title="Business profile could not be loaded" error={error} onRetry={refetch} />;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm" aria-labelledby="business-profile-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Building2 className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <h2 id="business-profile-title" className="font-heading font-bold">Business profile</h2>
            <p className="text-xs text-muted-foreground">Authoritative public identity, contact details, workshop address and opening hours.</p>
          </div>
        </div>
        {isFetching && !isLoading ? <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Refreshing</span> : null}
      </div>

      {error && profile ? <ErrorState className="mt-4" title="Latest business details could not be refreshed" error={error} onRetry={refetch} /> : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FieldShell id="business-name" label="Public business name" error={errors.name} required>
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-legal_name" label="Legal name">
          <Input value={form.legal_name} onChange={(event) => set("legal_name", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-email" label="Public email" error={errors.email} required>
          <Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-invoice_sender_email" label="Invoice sender email" hint="Must be a sender address verified by your email provider.">
          <Input type="email" value={form.invoice_sender_email} onChange={(event) => set("invoice_sender_email", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-phone" label="Public phone" error={errors.phone} required>
          <Input type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-website_url" label="Published website URL">
          <Input type="url" value={form.website_url} onChange={(event) => set("website_url", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-address" label="Full workshop address" error={errors.address} required className="sm:col-span-2">
          <Input value={form.address} onChange={(event) => set("address", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-address_line_1" label="Street address">
          <Input value={form.address_line_1} onChange={(event) => set("address_line_1", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-locality" label="Suburb">
          <Input value={form.locality} onChange={(event) => set("locality", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-region" label="State">
          <Input value={form.region} onChange={(event) => set("region", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-postcode" label="Postcode">
          <Input inputMode="numeric" value={form.postcode} onChange={(event) => set("postcode", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-timezone" label="Timezone" error={errors.timezone} required>
          <Input value={form.timezone} onChange={(event) => set("timezone", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-abn" label="ABN" hint="Confirm the legal entity before publishing this value.">
          <Input inputMode="numeric" value={form.abn} onChange={(event) => set("abn", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-tagline" label="Tagline" className="sm:col-span-2">
          <Input value={form.tagline} onChange={(event) => set("tagline", event.target.value)} />
        </FieldShell>
        <FieldShell id="business-subheading" label="Public description" className="sm:col-span-2">
          <Textarea value={form.subheading} onChange={(event) => set("subheading", event.target.value)} rows={3} />
        </FieldShell>
      </div>

      <fieldset className="mt-5 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">Opening hours</legend>
        <div className="space-y-3">
          {form.opening_hours.map((row, index) => (
            <div key={`${index}-${row.day}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <FieldShell id={`business-hours-day-${index}`} label="Days">
                <Input value={row.day || ""} onChange={(event) => setHour(index, "day", event.target.value)} placeholder="Monday – Sunday" />
              </FieldShell>
              <FieldShell id={`business-hours-time-${index}`} label="Hours">
                <Input value={row.hours || ""} onChange={(event) => setHour(index, "hours", event.target.value)} placeholder="11:00 AM – Midnight" />
              </FieldShell>
              <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => set("opening_hours", form.opening_hours.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Remove opening hours row ${index + 1}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {errors.opening_hours ? <p id="business-opening_hours-error" className="text-sm text-destructive" role="alert">{errors.opening_hours}</p> : null}
          <Button type="button" variant="outline" size="sm" onClick={() => set("opening_hours", [...form.opening_hours, { day: "", hours: "" }])}>
            <Plus className="h-4 w-4" /> Add hours row
          </Button>
        </div>
      </fieldset>

      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving business profile..." : "Save business profile"}
        </Button>
      </div>
    </section>
  );
}
