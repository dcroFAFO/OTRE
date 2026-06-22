import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { createBookingRequest } from "@/services/bookingService";
import { DEFAULT_BOOKING_FIELDS } from "@/config/platformConfig";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import PhoneNumberField from "@/components/booking/PhoneNumberField";
import PreferredDateField from "@/components/booking/PreferredDateField";
import { isModelValidForBrand } from "@/config/scooterBrands";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { normalizePhoneToE164 } from "@/lib/phone";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

const field = (key) => DEFAULT_BOOKING_FIELDS.find((f) => f.key === key) || {};
const options = (key) => field(key).options || [];

const EMPTY = {
  customer_name: "",
  customer_email: "",
  phone: "",
  asset_label: "",
  issue_type: "",
  issue_description: "",
  asset_make: "",
  asset_model: "",
  asset_custom_make: "",
  asset_custom_model: "",
  preferred_date: "",
  preferred_time_window: "Anytime",
  rideable: true,
  asap: false,
  consent: false,
  scooter_issue_summary: "",
  scooter_make_model: "",
  rideable_status: "",
  urgency_or_safety_notes: "",
  suspected_service_category: "",
};

function getBookingPrefill() {
  const params = new URLSearchParams(window.location.search);
  const issue = params.get("scooter_issue_summary") || "";
  const makeModel = params.get("scooter_make_model") || "";
  const rideableStatus = params.get("rideable_status") || "";
  const safetyNotes = params.get("urgency_or_safety_notes") || "";
  const category = params.get("suspected_service_category") || "";
  if (!issue && !makeModel && !rideableStatus && !safetyNotes && !category) return {};

  const details = [
    issue,
    makeModel && `Scooter: ${makeModel}`,
    rideableStatus && `Rideable: ${rideableStatus}`,
    safetyNotes && `Urgency/safety: ${safetyNotes}`,
    category && `Likely category: ${category}`,
  ].filter(Boolean).join("\n");

  return {
    issue_type: "Other",
    issue_description: details,
    asset_make: makeModel ? "Other" : "",
    asset_custom_make: makeModel,
    asset_label: makeModel,
    rideable: rideableStatus ? !/no|not|unsafe|leave|off road|don't ride|do not ride/i.test(rideableStatus) : true,
    scooter_issue_summary: issue,
    scooter_make_model: makeModel,
    rideable_status: rideableStatus,
    urgency_or_safety_notes: safetyNotes,
    suspected_service_category: category,
  };
}

export default function PublicBookingForm() {
  const { data: { services } } = usePlatformConfig();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...getBookingPrefill() }));
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => ({ ...current, [k]: null }));
  };
  const modelMatchesBrand = isModelValidForBrand(form.asset_make, form.asset_model);
  const isOther = form.issue_type === "Other";
  const issueValid = form.issue_type && (!isOther || form.issue_description.trim());

  const validateForm = () => {
    const nextErrors = {};
    if (!form.customer_name.trim()) nextErrors.customer_name = "Please enter your name.";
    if (!form.customer_email.trim()) nextErrors.customer_email = "Please enter your email.";
    if (!form.phone.trim()) nextErrors.phone = "Please enter your phone number.";

    const normalizedPhone = normalizePhoneToE164(form.phone);
    if (form.phone.trim() && !normalizedPhone.is_valid) nextErrors.phone = "Enter a valid Australian mobile number";

    if (!form.asset_label.trim()) nextErrors.asset_label = "Please select your scooter make and model.";
    if (form.asset_make && form.asset_make !== "Other" && form.asset_model && !modelMatchesBrand) nextErrors.asset_label = `The selected model doesn't belong to ${form.asset_make}.`;
    if (!form.issue_type) nextErrors.issue_type = "Please select the repair type.";
    if (isOther && !form.issue_description.trim()) nextErrors.issue_description = "Please describe the issue.";
    if (!form.consent) nextErrors.consent = "Please confirm we can contact you about this booking.";

    setErrors(nextErrors);
    return { isValid: Object.keys(nextErrors).length === 0, normalizedPhone };
  };

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
    if (submitting) return;

    const { isValid, normalizedPhone } = validateForm();
    if (!isValid) return;

    setSubmitting(true);
    try {
      const issue_description = isOther ? form.issue_description.trim() : form.issue_type;
      const result = await createBookingRequest({
        ...form,
        phone: normalizedPhone.phone_e164,
        phone_e164: normalizedPhone.phone_e164,
        customer_phone_e164: normalizedPhone.phone_e164,
        issue_description,
        photo_url: photoUrl,
      });
      setDone(result);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const managePath = `/register?email=${encodeURIComponent(form.customer_email)}&next=${encodeURIComponent("/portal")}&customerFlow=1`;

    return (
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 className="mt-4 font-heading text-2xl font-extrabold">Your repair request has been submitted.</h2>
        <p className="mt-2 text-muted-foreground">
          We have received your scooter repair request and will review the details. You will receive updates as the job progresses.
        </p>
        {done?.reference && (
          <div className="mt-5 rounded-2xl border-2 border-accent/40 bg-accent/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Job reference</p>
            <p className="mt-1 font-heading text-3xl font-extrabold text-foreground">{done.reference}</p>
          </div>
        )}
        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4 text-left">
          <h3 className="font-heading text-lg font-bold text-foreground">Want to track this repair online?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an account or verify your details to manage this job, view updates, and check the status of your repair.
          </p>
          <Button asChild size="lg" className="mt-4 w-full"><Link to={managePath}>Manage This Job</Link></Button>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            You can also contact On The Run Electrics directly if you need help with your booking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={submitting} className="rounded-2xl border border-border bg-card p-4 shadow-xl space-y-3 lg:p-5">
      <div className={submitting ? "space-y-3 opacity-60 pointer-events-none" : "space-y-3"}>
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          <section className="space-y-2.5">
            <h2 className="font-heading text-base font-extrabold">Your Details</h2>
            <div className="grid gap-2">
              <Field label="Name" required error={errors.customer_name}><Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} /></Field>
              <Field label={field("email").label || "Email"} required error={errors.customer_email}><Input type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} /></Field>
              <PhoneNumberField
                label={field("phone").label || "Phone"}
                required
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                error={errors.phone}
              />
              <Field label={field("asset_label").label || "Scooter"} required error={errors.asset_label}>
                <AssetBrandPicker
                  make={form.asset_make}
                  model={form.asset_model}
                  customMake={form.asset_custom_make}
                  customModel={form.asset_custom_model}
                  onChange={({ make, model, customMake, customModel, label }) => {
                    setForm((f) => ({ ...f, asset_make: make, asset_model: model, asset_custom_make: customMake, asset_custom_model: customModel, asset_label: label }));
                    setErrors((current) => ({ ...current, asset_label: null }));
                  }}
                />

              </Field>
            </div>
          </section>

          <section className="space-y-2.5">
            <h2 className="font-heading text-base font-extrabold">Repair Details</h2>
            <div className="grid gap-2">
              <Field label={field("issue_description").label || "Issue"} required error={errors.issue_type || errors.issue_description}>
                <Select value={form.issue_type} onValueChange={(v) => {
                  set("issue_type", v);
                  setErrors((current) => ({ ...current, issue_type: null, issue_description: null }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a service…" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {isOther && <Textarea value={form.issue_description} onChange={(e) => set("issue_description", e.target.value)} placeholder={field("issue_description").placeholder} className="h-16 mt-1.5" />}
              </Field>
              <Field label={field("rideable").label || "Is it rideable?"}>
                <Select value={form.rideable ? "yes" : "no"} onValueChange={(v) => set("rideable", v === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{options("rideable").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={field("photo").label || "Photo"}>
                <label className="flex h-9 items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground hover:border-accent transition-colors">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {photoUrl ? "Photo uploaded ✓" : "Upload photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </label>
              </Field>
            </div>
          </section>

          <section className="space-y-2.5">
            <h2 className="font-heading text-base font-extrabold">Scheduling</h2>
            <div className="grid gap-2">
              <Field label={field("preferred_date").label || "Preferred date"}>
                <PreferredDateField value={form.preferred_date} onChange={(value) => set("preferred_date", value)} disabled={form.asap} className={form.asap ? "opacity-50" : ""} />
              </Field>
              <Field label={field("preferred_time_window").label || "Preferred time"}>
                <Select value={form.preferred_time_window} onValueChange={(v) => set("preferred_time_window", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{options("preferred_time_window").map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={form.asap} onCheckedChange={(v) => setForm((f) => ({ ...f, asap: !!v, preferred_date: v ? "" : f.preferred_date }))} />
                <span>ASAP</span>
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-1">
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox checked={form.consent} onCheckedChange={(v) => set("consent", !!v)} className="mt-0.5" />
            <span>I agree to be contacted about this booking and understand my booking details should be kept private.</span>
          </label>
          {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}
        </div>
      </div>

      {submitting && (
        <p className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-medium text-accent flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Sending your booking request…
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg disabled:cursor-not-allowed">
        {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting repair request…</> : "Submit Repair Request"}
      </Button>
    </form>
  );
}

function Field({ label, required, error, children }) {
  return <div className="space-y-1"><Label className="text-xs font-semibold">{label}{required && <span className="text-accent"> *</span>}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}