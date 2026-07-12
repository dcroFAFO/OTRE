import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBookingRequest } from "@/services/bookingService";
import { DEFAULT_BOOKING_FIELDS } from "@/config/platformConfig";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import PhoneNumberField from "@/components/booking/PhoneNumberField";
import BookingStepIndicator from "@/components/booking/BookingStepIndicator";
import { isModelValidForBrand } from "@/config/scooterBrands";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { normalizePhoneToE164 } from "@/lib/phone";
import { CheckCircle2, Loader2, ArrowLeft, ArrowRight } from "lucide-react";

const field = (key) => DEFAULT_BOOKING_FIELDS.find((f) => f.key === key) || { key, label: "", placeholder: "" };

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
  rideable: true,
  consent: false,
  scooter_issue_summary: "",
  scooter_make_model: "",
  rideable_status: "",
  urgency_or_safety_notes: "",
  suspected_service_category: "",
};

const EMPTY_ERRORS = {
  customer_name: null,
  customer_email: null,
  phone: null,
  asset_label: null,
  issue_type: null,
  issue_description: null,
  consent: null,
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

export default function PublicBookingForm({ guestOnly = false }) {
  const { data: { services } } = usePlatformConfig();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...getBookingPrefill() }));
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [errors, setErrors] = useState(EMPTY_ERRORS);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => ({ ...current, [k]: null }));
  };
  const modelMatchesBrand = isModelValidForBrand(form.asset_make, form.asset_model);
  const isOther = form.issue_type === "Other";

  const validateStep1 = () => {
    const nextErrors = {};
    if (!form.customer_name.trim()) nextErrors.customer_name = "Please enter your name.";
    if (!form.customer_email.trim()) nextErrors.customer_email = "Please enter your email.";
    if (!form.phone.trim()) nextErrors.phone = "Please enter your phone number.";
    const normalizedPhone = normalizePhoneToE164(form.phone);
    if (form.phone.trim() && !normalizedPhone.is_valid) nextErrors.phone = "Enter a valid Australian mobile number";
    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep2 = () => {
    const nextErrors = {};
    if (!form.asset_label.trim()) nextErrors.asset_label = "Please select your scooter make and model.";
    if (form.asset_make && form.asset_make !== "Other" && form.asset_model && !modelMatchesBrand) nextErrors.asset_label = `The selected model doesn't belong to ${form.asset_make}.`;
    if (!form.issue_type) nextErrors.issue_type = "Please select the repair type.";
    if (isOther && !form.issue_description.trim()) nextErrors.issue_description = "Please describe the issue.";
    if (!form.consent) nextErrors.consent = "Please confirm we can contact you about this booking.";
    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validateStep2()) return;

    setSubmitting(true);
    try {
      const normalizedPhone = normalizePhoneToE164(form.phone);
      const issue_description = isOther ? form.issue_description.trim() : form.issue_type;
      const result = await createBookingRequest({
        ...form,
        phone: normalizedPhone.phone_e164,
        phone_e164: normalizedPhone.phone_e164,
        customer_phone_e164: normalizedPhone.phone_e164,
        issue_description,
      });
      setDone(result);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const viewPath = done.managePath || "/portal";
    const accountPath = done.accountPath || `/register?email=${encodeURIComponent(form.customer_email)}&next=${encodeURIComponent("/portal")}&customerFlow=1`;

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
        {guestOnly ? (
          <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4 text-left">
            <h3 className="font-heading text-lg font-bold text-foreground">Want easier bookings next time?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You can create a free account later to manage future bookings, updates, invoices and offers from your customer portal.
            </p>
            <Button asChild variant="outline" className="mt-4 w-full"><Link to={accountPath}>Create a free account</Link></Button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4 text-left">
            <h3 className="font-heading text-lg font-bold text-foreground">Track this repair online</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              View this job securely now, or create an account to manage this and future jobs from your dashboard.
            </p>
            <Button asChild size="lg" className="mt-4 w-full"><Link to={viewPath}>View My Job</Link></Button>
            {!done?.linked && <Button asChild variant="outline" className="mt-3 w-full"><Link to={accountPath}>Create an account to manage this job</Link></Button>}
            <p className="mt-3 text-xs text-muted-foreground text-center">
              You can also contact On The Run Electrics directly if you need help with your booking.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={submitting} className="rounded-2xl border border-border bg-card p-4 shadow-xl space-y-3 lg:p-5">
      <BookingStepIndicator step={step} />

      <div className={submitting ? "space-y-3 opacity-60 pointer-events-none" : "space-y-3"}>
        {step === 1 && (
          <section className="space-y-2.5">
            <h2 className="font-heading text-base font-extrabold">Your Details</h2>
            <div className="grid gap-2">
              <Field label="Name" htmlFor="booking-name" required error={errors.customer_name}>
                <Input id="booking-name" name="name" autoComplete="name" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
              </Field>
              <Field label={field("email").label || "Email"} htmlFor="booking-email" required error={errors.customer_email}>
                <Input id="booking-email" name="email" type="email" autoComplete="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} />
              </Field>
              <PhoneNumberField
                label={field("phone").label || "Phone"}
                required
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                error={errors.phone}
              />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-2.5">
            <h2 className="font-heading text-base font-extrabold">Scooter & Issue</h2>
            <div className="grid gap-2">
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
              <div className="space-y-1">
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={form.consent} onCheckedChange={(v) => set("consent", !!v)} className="mt-0.5" />
                  <span>I agree to be contacted about this booking and understand my booking details should be kept private.</span>
                </label>
                {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}
              </div>
            </div>
          </section>
        )}
      </div>

      {submitting && (
        <p className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-medium text-accent flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Sending your booking request…
        </p>
      )}

      <div className="flex gap-2">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={goBack} disabled={submitting} className="flex-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        {step < 2 ? (
          <Button type="button" onClick={goNext} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={submitting} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground disabled:cursor-not-allowed">
            {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting…</> : "Submit Repair Request"}
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({ label, htmlFor = undefined, required, error, children }) {
  return <div className="space-y-1"><Label htmlFor={htmlFor} className="text-xs font-semibold">{label}{required && <span className="text-accent"> *</span>}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}
