import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldShell } from "@/components/shared";
import { createBookingRequest, sendBookingVerificationCode, verifyBookingCode } from "@/services/bookingService";
import { DEFAULT_BOOKING_FIELDS } from "@/config/platformConfig";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import PhoneNumberField from "@/components/booking/PhoneNumberField";
import PreferredDateField from "@/components/booking/PreferredDateField";
import BookingStepIndicator from "@/components/booking/BookingStepIndicator";
import { isModelValidForBrand } from "@/config/scooterBrands";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { normalizePhoneToE164 } from "@/lib/phone";
import { getSafeErrorMessage } from "@/lib/errors";

/** @returns {Record<string, any>} */
const field = (key) => DEFAULT_BOOKING_FIELDS.find((item) => item.key === key) || {};

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
  preferred_date: "",
  scooter_issue_summary: "",
  scooter_make_model: "",
  rideable_status: "",
  urgency_or_safety_notes: "",
  suspected_service_category: "",
};

const ERROR_FOCUS = {
  customer_name: "booking-name",
  customer_email: "booking-email",
  phone: "booking-phone",
  asset_label: "booking-asset-make",
  issue_type: "booking-issue-type",
  issue_description: "booking-issue-description",
  preferred_date: "booking-preferred-date",
  consent: "booking-consent",
  verification_channel: "booking-channel-sms",
  verification_code: "booking-verification-code",
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
  const [verificationChannel, setVerificationChannel] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(/** @type {any} */ (null));
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState(/** @type {Record<string, string | null>} */ ({}));
  const [preferredDateValid, setPreferredDateValid] = useState(true);

  const busy = sendingCode || submitting;
  const modelMatchesBrand = isModelValidForBrand(form.asset_make, form.asset_model);
  const isOther = form.issue_type === "Other";

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: null }));
    setSubmitError("");
    if (key === "customer_email" || key === "phone") {
      setVerificationChannel("");
      setVerificationCode("");
      setVerificationStatus("");
    }
  };

  /** @param {Record<string, string>} nextErrors */
  const reportErrors = (nextErrors) => {
    setErrors((current) => ({ ...current, ...nextErrors }));
    const first = Object.keys(nextErrors)[0];
    if (first) window.requestAnimationFrame(() => document.getElementById(ERROR_FOCUS[first])?.focus());
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep1 = () => {
    const nextErrors = /** @type {Record<string, string>} */ ({});
    if (!form.customer_name.trim()) nextErrors.customer_name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.customer_email.trim())) nextErrors.customer_email = "Enter a valid email address.";
    const normalizedPhone = normalizePhoneToE164(form.phone);
    if (!form.phone.trim()) nextErrors.phone = "Please enter your phone number.";
    else if (!normalizedPhone.is_valid) nextErrors.phone = "Enter a valid Australian mobile number.";
    return reportErrors(nextErrors);
  };

  const validateStep2 = () => {
    const nextErrors = /** @type {Record<string, string>} */ ({});
    if (!form.asset_label.trim()) nextErrors.asset_label = "Please select your scooter make and model.";
    if (form.asset_make && form.asset_make !== "Other" && form.asset_model && !modelMatchesBrand) nextErrors.asset_label = `The selected model doesn't belong to ${form.asset_make}.`;
    if (!form.issue_type) nextErrors.issue_type = "Please select the repair type.";
    if (isOther && !form.issue_description.trim()) nextErrors.issue_description = "Please describe the issue.";
    if (!preferredDateValid) nextErrors.preferred_date = "Enter a valid future date in DD-MM-YY format, or leave it blank.";
    if (!form.consent) nextErrors.consent = "Please confirm we can contact you about this booking.";
    return reportErrors(nextErrors);
  };

  const goNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const goBack = () => {
    setSubmitError("");
    setStep((current) => Math.max(1, current - 1));
  };

  const sendCode = async (channel) => {
    if (busy || !validateStep1()) return;
    setSendingCode(true);
    setSubmitError("");
    setVerificationStatus("");
    try {
      await sendBookingVerificationCode({ name: form.customer_name, email: form.customer_email, phone: form.phone, channel });
      setVerificationChannel(channel);
      setVerificationCode("");
      setErrors((current) => ({ ...current, verification_channel: null, verification_code: null }));
      setVerificationStatus(channel === "email" ? `Code sent to ${form.customer_email}.` : `Code sent by SMS to ${form.phone}.`);
      window.requestAnimationFrame(() => document.getElementById("booking-verification-code")?.focus());
    } catch (error) {
      setSubmitError(getSafeErrorMessage(error, "The verification code could not be sent. Please try again."));
    } finally {
      setSendingCode(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (step < 3) {
      goNext();
      return;
    }
    const nextErrors = /** @type {Record<string, string>} */ ({});
    if (!verificationChannel) nextErrors.verification_channel = "Choose SMS or email and send a code.";
    if (verificationCode.replace(/\D/g, "").length !== 6) nextErrors.verification_code = "Enter the 6-digit verification code.";
    if (!reportErrors(nextErrors)) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const normalizedPhone = normalizePhoneToE164(form.phone);
      const verified = await verifyBookingCode({ email: form.customer_email, phone: normalizedPhone.phone_e164, code: verificationCode });
      if (!verified?.verified) throw Object.assign(new Error("Contact verification failed."), { status: 400 });
      setVerificationStatus("Contact verified. Sending your booking request...");
      const result = await createBookingRequest({
        ...form,
        phone: normalizedPhone.phone_e164,
        phone_e164: normalizedPhone.phone_e164,
        customer_phone_e164: normalizedPhone.phone_e164,
        issue_description: isOther ? form.issue_description.trim() : form.issue_type,
        contact_verified: true,
        verification_id: verified.verification_id,
        verification_channel: verificationChannel,
      });
      setDone(result);
    } catch (error) {
      setSubmitError(getSafeErrorMessage(error, "Your booking request could not be submitted. Your details are still here, so please retry."));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const viewPath = done.managePath || "/portal";
    const accountPath = done.accountPath || `/register?email=${encodeURIComponent(form.customer_email)}&next=${encodeURIComponent("/portal")}&customerFlow=1`;
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-center shadow-xl sm:p-8" aria-labelledby="booking-success-title">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-8 w-8" aria-hidden="true" /></span>
        <h2 id="booking-success-title" className="mt-4 font-heading text-2xl font-extrabold">Your repair request has been submitted</h2>
        <p className="mt-2 text-muted-foreground">We will review the details and contact you to confirm the booking.</p>
        {done.reference ? <div className="mt-5 rounded-lg border-2 border-accent/40 bg-accent/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Job reference</p><p className="mt-1 font-heading text-3xl font-extrabold">{done.reference}</p></div> : null}
        {guestOnly ? (
          <div className="mt-6 border-t border-border pt-5 text-left">
            <h3 className="font-heading text-lg font-bold">Track or manage this repair</h3>
            <p className="mt-2 text-sm text-muted-foreground">Use the secure tracking link for this booking, or create an account to manage all future repairs.</p>
            {done.trackingPath ? <Button asChild className="mt-4 w-full"><Link to={done.trackingPath}>Track this repair securely</Link></Button> : null}
            <Button asChild variant="outline" className="mt-3 w-full"><Link to={accountPath}>Create a customer account</Link></Button>
            <p className="mt-3 text-xs text-muted-foreground">Keep the tracking link private. Anyone with the link can use the permissions granted to this booking.</p>
          </div>
        ) : <Button asChild size="lg" className="mt-6 w-full"><Link to={viewPath}>View My Job</Link></Button>}
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={busy} className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-xl sm:p-6">
      <BookingStepIndicator step={step} />

      {submitError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>We could not continue</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className={busy ? "pointer-events-none space-y-4 opacity-60" : "space-y-4"}>
        {step === 1 ? (
          <section className="space-y-4" aria-labelledby="booking-details-heading">
            <div><h2 id="booking-details-heading" className="font-heading text-lg font-extrabold">Your details</h2><p className="mt-1 text-xs text-muted-foreground">We will verify either this mobile or email before accepting the request.</p></div>
            <FieldShell id="booking-name" label="Name" required error={errors.customer_name || undefined}>
              <Input autoComplete="name" value={form.customer_name} onChange={(event) => set("customer_name", event.target.value)} />
            </FieldShell>
            <FieldShell id="booking-email" label={field("email").label || "Email"} required error={errors.customer_email || undefined}>
              <Input type="email" autoComplete="email" value={form.customer_email} onChange={(event) => set("customer_email", event.target.value)} />
            </FieldShell>
            <PhoneNumberField label={field("phone").label || "Phone"} required value={form.phone} onChange={(event) => set("phone", event.target.value)} error={errors.phone} />
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4" aria-labelledby="booking-scooter-heading">
            <h2 id="booking-scooter-heading" className="font-heading text-lg font-extrabold">Scooter and issue</h2>
            <fieldset aria-describedby={errors.asset_label ? "booking-asset-error" : undefined}>
              <legend className="mb-2 text-sm font-semibold">Scooter make and model <span className="text-destructive" aria-hidden="true">*</span></legend>
              <AssetBrandPicker
                id="booking-asset"
                make={form.asset_make}
                model={form.asset_model}
                customMake={form.asset_custom_make}
                customModel={form.asset_custom_model}
                invalid={!!errors.asset_label}
                describedBy={errors.asset_label ? "booking-asset-error" : undefined}
                onChange={({ make, model, customMake, customModel, label }) => {
                  setForm((current) => ({ ...current, asset_make: make, asset_model: model, asset_custom_make: customMake, asset_custom_model: customModel, asset_label: label }));
                  setErrors((current) => ({ ...current, asset_label: null }));
                }}
              />
              {errors.asset_label ? <p id="booking-asset-error" className="mt-2 text-sm text-destructive" role="alert">{errors.asset_label}</p> : null}
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="booking-issue-type">Repair type <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Select value={form.issue_type} onValueChange={(value) => { set("issue_type", value); setErrors((current) => ({ ...current, issue_type: null, issue_description: null })); }}>
                <SelectTrigger id="booking-issue-type" aria-invalid={!!errors.issue_type} aria-describedby={errors.issue_type ? "booking-issue-type-error" : undefined}><SelectValue placeholder="Select a service" /></SelectTrigger>
                <SelectContent>{services.map((service) => <SelectItem key={service.name} value={service.name}>{service.name}</SelectItem>)}<SelectItem value="Other">Other</SelectItem></SelectContent>
              </Select>
              {errors.issue_type ? <p id="booking-issue-type-error" className="text-sm text-destructive" role="alert">{errors.issue_type}</p> : null}
            </div>

            {isOther ? <FieldShell id="booking-issue-description" label="Describe the issue" required error={errors.issue_description || undefined}><Textarea rows={4} value={form.issue_description} onChange={(event) => set("issue_description", event.target.value)} placeholder={field("issue_description").placeholder} /></FieldShell> : null}
            <FieldShell id="booking-preferred-date" label="Preferred completion date" hint="This is a preference, not a confirmed booking time." error={errors.preferred_date || undefined}><PreferredDateField value={form.preferred_date} onChange={(value) => set("preferred_date", value)} onValidityChange={(valid) => { setPreferredDateValid(valid); if (valid) setErrors((current) => ({ ...current, preferred_date: null })); }} /></FieldShell>

            <div>
              <div className="flex items-start gap-2">
                <Checkbox id="booking-consent" checked={form.consent} onCheckedChange={(value) => set("consent", !!value)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "booking-consent-error" : undefined} className="mt-0.5" />
                <Label htmlFor="booking-consent" className="text-sm font-normal leading-5">I agree to be contacted about this booking and understand the details should be kept private.</Label>
              </div>
              {errors.consent ? <p id="booking-consent-error" className="mt-2 text-sm text-destructive" role="alert">{errors.consent}</p> : null}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4" aria-labelledby="booking-verification-heading">
            <div><h2 id="booking-verification-heading" className="font-heading text-lg font-extrabold">Verify your contact details</h2><p className="mt-1 text-sm text-muted-foreground">Choose one method. The six-digit code expires after 10 minutes.</p></div>
            <div role="group" aria-label="Verification delivery method" className="grid grid-cols-2 gap-2">
              <Button id="booking-channel-sms" type="button" variant={verificationChannel === "sms" ? "default" : "outline"} disabled={busy} onClick={() => sendCode("sms")}><MessageSquareText className="h-4 w-4" /> Text code</Button>
              <Button type="button" variant={verificationChannel === "email" ? "default" : "outline"} disabled={busy} onClick={() => sendCode("email")}><Mail className="h-4 w-4" /> Email code</Button>
            </div>
            {errors.verification_channel ? <p className="text-sm text-destructive" role="alert">{errors.verification_channel}</p> : null}
            {sendingCode ? <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Sending verification code...</p> : null}
            {verificationStatus ? <p className="text-sm font-medium text-emerald-800" role="status" aria-live="polite">{verificationStatus}</p> : null}

            {verificationChannel ? (
              <div className="space-y-3">
                <Label htmlFor="booking-verification-code">Verification code</Label>
                <InputOTP id="booking-verification-code" maxLength={6} value={verificationCode} onChange={(value) => { setVerificationCode(value); setErrors((current) => ({ ...current, verification_code: null })); }} autoComplete="one-time-code" aria-invalid={!!errors.verification_code} aria-describedby={errors.verification_code ? "booking-verification-code-error" : undefined}>
                  <InputOTPGroup>{Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} />)}</InputOTPGroup>
                </InputOTP>
                {errors.verification_code ? <p id="booking-verification-code-error" className="text-sm text-destructive" role="alert">{errors.verification_code}</p> : null}
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => sendCode(verificationChannel)}>Resend code</Button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      {submitting ? <p className="flex items-center justify-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-medium text-accent" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Verifying and sending your booking request...</p> : null}

      <div className="flex gap-2">
        {step > 1 ? <Button type="button" variant="outline" onClick={goBack} disabled={busy} className="flex-1"><ArrowLeft className="h-4 w-4" /> Back</Button> : null}
        {step < 3 ? <Button type="button" onClick={goNext} disabled={busy} className="flex-1">Next <ArrowRight className="h-4 w-4" /></Button> : <Button type="submit" disabled={busy || !verificationChannel} className="flex-1">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{submitting ? "Submitting..." : "Submit repair request"}</Button>}
      </div>
    </form>
  );
}
