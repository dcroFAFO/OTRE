import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createBookingRequest } from "@/services/bookingService";
import { DEFAULT_BOOKING_COPY, DEFAULT_BOOKING_FIELDS } from "@/config/platformConfig";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import PhoneNumberField from "@/components/booking/PhoneNumberField";
import PreferredDateField from "@/components/booking/PreferredDateField";
import { BRAND_NAMES, SCOOTER_BRANDS, isModelValidForBrand } from "@/config/scooterBrands";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { normalizePhoneToE164 } from "@/lib/phone";

const field = (key) => DEFAULT_BOOKING_FIELDS.find((f) => f.key === key) || {};
const options = (key) => field(key).options || [];

const EMPTY = {
  customer_name: "", phone: "", asset_label: "", issue_type: "", issue_description: "",
  asset_make: "", asset_model: "", asset_custom_make: "", asset_custom_model: "",
  preferred_date: "", preferred_time_window: "Anytime", rideable: true,
  asap: false, consent: false,
};

function localPhone(value) {
  const text = String(value || "").replace(/\s/g, "");
  if (text.startsWith("+61")) return text.slice(3);
  if (text.startsWith("61")) return text.slice(2);
  if (text.startsWith("0")) return text.slice(1);
  return text;
}

function savedScooterLabel(profile) {
  return profile?.scooter_make_model || profile?.default_scooter_make_model || [profile?.scooter_make, profile?.scooter_model].filter(Boolean).join(" ");
}

function scooterPickerValues(profile) {
  const label = savedScooterLabel(profile).trim();
  const make = profile?.scooter_make || "";
  const model = profile?.scooter_model || "";
  if (make || model) return { make, model, customMake: "", customModel: "", label: label || [make, model].filter(Boolean).join(" ") };

  const matchedMake = BRAND_NAMES.find((brand) => label === brand || label.startsWith(`${brand} `));
  if (matchedMake) {
    const rest = label.slice(matchedMake.length).trim();
    const knownModel = (SCOOTER_BRANDS[matchedMake] || []).find((item) => item === rest);
    return { make: matchedMake, model: knownModel || (rest ? "Other model" : ""), customMake: "", customModel: knownModel ? "" : rest, label };
  }

  return label ? { make: "Other", model: "", customMake: label, customModel: "", label } : { make: "", model: "", customMake: "", customModel: "", label: "" };
}

export default function CustomerBookingModal({ open, onClose, user, profile, profileLoading = false, onSuccess }) {
  const { data: { services } } = usePlatformConfig();
  const [form, setForm] = useState(EMPTY);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [errors, setErrors] = useState({});
  const [dateValid, setDateValid] = useState(true);

  useEffect(() => {
    if (!open) return;
    const scooter = scooterPickerValues(profile);
    setForm((current) => ({
      ...current,
      customer_name: current.customer_name || profile?.display_name || profile?.full_name || profile?.name || user?.full_name || "",
      phone: current.phone || localPhone(profile?.phone_e164),
      asset_make: current.asset_make || scooter.make,
      asset_model: current.asset_model || scooter.model,
      asset_custom_make: current.asset_custom_make || scooter.customMake,
      asset_custom_model: current.asset_custom_model || scooter.customModel,
      asset_label: current.asset_label || scooter.label,
    }));
  }, [open, profile, user]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => ({ ...current, [k]: null }));
  };
  const modelMatchesBrand = isModelValidForBrand(form.asset_make, form.asset_model);
  const isOther = form.issue_type === "Other";
  const issueValid = form.issue_type && (!isOther || form.issue_description.trim());

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    const normalizedPhone = normalizePhoneToE164(form.phone);
    if (!normalizedPhone.is_valid) {
      setErrors({ phone: "Enter a valid Australian mobile number" });
      return;
    }
    if (!dateValid) {
      setErrors({ preferred_date: "Enter a valid date" });
      return;
    }
    if (!form.consent || !form.asset_label || !modelMatchesBrand || !issueValid) return;
    setSubmitting(true);
    try {
      const issue_description = isOther ? form.issue_description.trim() : form.issue_type;
      const job = await createBookingRequest({
        ...form,
        customer_name: form.customer_name || profile?.display_name || user?.full_name,
        customer_email: user?.email,
        phone: normalizedPhone.phone_e164,
        phone_e164: normalizedPhone.phone_e164,
        customer_phone_e164: normalizedPhone.phone_e164,
        issue_description,
        photo_url: photoUrl,
      });
      setDone(job);
    } catch (err) {
      console.error("Booking failed:", err);
      alert("Sorry — couldn't submit your booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDone(null);
    setForm(EMPTY);
    setPhotoUrl(null);
    onClose();
  };

  const handleAnother = () => {
    setDone(null);
    setForm(EMPTY);
    setPhotoUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-extrabold">
            {done ? DEFAULT_BOOKING_COPY.successTitle : DEFAULT_BOOKING_COPY.title}
          </DialogTitle>
        </DialogHeader>

        {profileLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your profile…
          </div>
        ) : done ? (
          <div className="text-center py-6">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <p className="mt-4 text-muted-foreground">
              Thanks {(form.customer_name || user?.full_name || "there").split(" ")[0]} — request <span className="font-semibold text-foreground">{done.reference}</span>. Our team will review it and confirm shortly.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{DEFAULT_BOOKING_COPY.successNote}</p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" onClick={handleAnother}>{DEFAULT_BOOKING_COPY.anotherLabel}</Button>
              <Button onClick={() => { onSuccess?.(); handleClose(); }}>Back to my jobs</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 pt-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={field("customer_name").label} required>
                <Input value={form.customer_name || user?.full_name || ""} onChange={(e) => set("customer_name", e.target.value)} placeholder={field("customer_name").placeholder} required />
              </Field>
              <PhoneNumberField
                label={field("phone").label || "Mobile"}
                required
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                error={errors.phone}
              />
            </div>

            <Field label={field("email").label}>
              <Input type="email" value={user?.email || ""} disabled className="opacity-70" />
              <p className="text-xs text-muted-foreground">Bookings are linked to your signed-in account.</p>
            </Field>

            <Field label={field("asset_label").label} required>
              <AssetBrandPicker
                make={form.asset_make}
                model={form.asset_model}
                customMake={form.asset_custom_make}
                customModel={form.asset_custom_model}
                onChange={({ make, model, customMake, customModel, label }) =>
                  setForm((f) => ({ ...f, asset_make: make, asset_model: model, asset_custom_make: customMake, asset_custom_model: customModel, asset_label: label }))
                }
              />
              {form.asset_make && form.asset_make !== "Other" && form.asset_model && !modelMatchesBrand && (
                <p className="text-sm text-destructive">The selected model doesn't belong to {form.asset_make}.</p>
              )}
            </Field>

            <Field label={field("issue_description").label} required>
              <Select value={form.issue_type} onValueChange={(v) => set("issue_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select a service…" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {isOther && (
                <Textarea value={form.issue_description} onChange={(e) => set("issue_description", e.target.value)} placeholder={field("issue_description").placeholder} className="h-24 mt-2" required />
              )}
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={field("preferred_date").label} error={errors.preferred_date}>
                <PreferredDateField
                  value={form.preferred_date}
                  onChange={(value) => set("preferred_date", value)}
                  onValidityChange={setDateValid}
                  disabled={form.asap}
                  className={form.asap ? "opacity-50" : ""}
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                  <Checkbox checked={form.asap} onCheckedChange={(v) => setForm((f) => ({ ...f, asap: !!v, preferred_date: v ? "" : f.preferred_date }))} />
                  <span>ASAP — as soon as possible</span>
                </label>
              </Field>
              <Field label={field("preferred_time_window").label}>
                <Select value={form.preferred_time_window} onValueChange={(v) => set("preferred_time_window", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{options("preferred_time_window").map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={field("rideable").label}>
                <Select value={form.rideable ? "yes" : "no"} onValueChange={(v) => set("rideable", v === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{options("rideable").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            <Field label={field("photo").label}>
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-accent transition-colors">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {photoUrl ? "Photo uploaded ✓" : "Upload a photo of the issue"}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </Field>

            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <Checkbox checked={form.consent} onCheckedChange={(v) => set("consent", !!v)} className="mt-0.5" />
              <span>{DEFAULT_BOOKING_COPY.consentText}</span>
            </label>

            <Button type="submit" disabled={submitting || !form.consent || !modelMatchesBrand || !issueValid} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : DEFAULT_BOOKING_COPY.submitLabel}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}{required && <span className="text-accent"> *</span>}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}