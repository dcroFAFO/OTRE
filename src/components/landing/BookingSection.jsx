import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Upload, CalendarCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createBookingRequest } from "@/services/bookingService";
import { DEFAULT_BOOKING_COPY, DEFAULT_BOOKING_FIELDS } from "@/config/platformConfig";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import PhoneNumberField from "@/components/booking/PhoneNumberField";
import { isModelValidForBrand } from "@/config/scooterBrands";
import { normalizePhoneToE164 } from "@/lib/phone";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import BookingSignInGate from "@/components/landing/BookingSignInGate";

const field = (key) => DEFAULT_BOOKING_FIELDS.find((f) => f.key === key) || {};
const options = (key) => field(key).options || [];

const EMPTY = {
  customer_name: "", phone: "", phone_country_code: "+61", asset_label: "", issue_type: "", issue_description: "",
  asset_make: "", asset_model: "", asset_custom_make: "", asset_custom_model: "",
  preferred_date: "", preferred_time_window: "Anytime", rideable: true,
  asap: false, consent: false,
};

export default function BookingSection() {
  const { data: { services } } = usePlatformConfig();
  const { user, isLoading } = useCurrentUser();
  const [form, setForm] = useState(EMPTY);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const [phoneError, setPhoneError] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const modelMatchesBrand = isModelValidForBrand(form.asset_make, form.asset_model);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const isOther = form.issue_type === "Other";
  const issueValid = form.issue_type && (!isOther || form.issue_description.trim());

  const submit = async (e) => {
    e.preventDefault();
    if (!form.consent || !form.asset_label || !modelMatchesBrand || !issueValid) return;
    const normalizedPhone = normalizePhoneToE164(form.phone, form.phone_country_code);
    if (!normalizedPhone.is_valid) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);
    setSubmitting(true);
    setError(null);
    try {
      const issue_description = isOther ? form.issue_description.trim() : form.issue_type;
      const job = await createBookingRequest({
        ...form,
        customer_name: form.customer_name || user.full_name,
        phone_e164: normalizedPhone.phone_e164,
        customer_phone_e164: normalizedPhone.phone_e164,
        phone_display: normalizedPhone.phone_display,
        issue_description,
        photo_url: photoUrl,
      });
      setDone(job);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Sorry — couldn't submit your booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Booking requires a signed-in account so every job is tied to the customer's identity.
  if (isLoading) {
    return (
      <section id="book" className="py-20 sm:py-28">
        <div className="mx-auto max-w-md px-5 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }
  if (!user) return <BookingSignInGate />;

  if (done) {
    return (
      <section id="book" className="py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <div className="rounded-3xl border border-accent/30 bg-card p-10 text-center shadow-xl animate-in fade-in zoom-in-95 duration-300">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h2 className="mt-5 font-heading text-2xl font-extrabold text-foreground">{DEFAULT_BOOKING_COPY.successTitle}</h2>
            <p className="mt-2 text-muted-foreground">
              Thanks {done.customer_name?.split(" ")[0]} — request <span className="font-semibold text-foreground">{done.reference}</span>. {DEFAULT_BOOKING_COPY.successBody.replace("{status}", "Requested")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{DEFAULT_BOOKING_COPY.successNote}</p>
            <Button className="mt-6" variant="outline" onClick={() => { setDone(null); setForm(EMPTY); setPhotoUrl(null); }}>
              {DEFAULT_BOOKING_COPY.anotherLabel}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="book" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent"><CalendarCheck className="h-4 w-4" /> {DEFAULT_BOOKING_COPY.eyebrow}</span>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">{DEFAULT_BOOKING_COPY.title}</h2>
          <p className="mt-3 text-muted-foreground">{DEFAULT_BOOKING_COPY.body}</p>
        </div>

        <form
          onSubmit={submit}
          className="mt-10 rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-xl space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={field("customer_name").label} required>
              <Input value={form.customer_name || user.full_name || ""} onChange={(e) => set("customer_name", e.target.value)} placeholder={field("customer_name").placeholder} required />
            </Field>
            <PhoneNumberField
              label={field("phone").label}
              required
              countryCode={form.phone_country_code}
              onCountryCodeChange={(value) => set("phone_country_code", value)}
              value={form.phone}
              onChange={(e) => { set("phone", e.target.value); setPhoneError(false); }}
              error={phoneError}
            />
          </div>
          <Field label={field("email").label}>
            <Input type="email" value={user.email} disabled className="opacity-70" />
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
              <p className="text-sm text-destructive">The selected model doesn't belong to {form.asset_make}. Please pick a matching model.</p>
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
            <Field label={field("preferred_date").label}>
              <Input type="date" value={form.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} disabled={form.asap} className={form.asap ? "opacity-50" : ""} />
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

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" disabled={submitting || !form.consent || !form.phone || !form.asset_label || !modelMatchesBrand || !issueValid} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : DEFAULT_BOOKING_COPY.submitLabel}
          </Button>
        </form>
      </div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}{required && <span className="text-accent"> *</span>}</Label>
      {children}
    </div>
  );
}