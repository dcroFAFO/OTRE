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
import { isModelValidForBrand } from "@/config/scooterBrands";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { CheckCircle2, Copy, Loader2, Upload } from "lucide-react";

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
};

export default function PublicBookingForm() {
  const { data: { services } } = usePlatformConfig();
  const [form, setForm] = useState(EMPTY);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
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

  const copyLink = async () => {
    if (!done?.trackingLink) return;
    await navigator.clipboard.writeText(done.trackingLink);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.consent || !form.customer_email || !form.customer_name || !form.phone || !form.asset_label || !modelMatchesBrand || !issueValid) return;
    setSubmitting(true);
    try {
      const issue_description = isOther ? form.issue_description.trim() : form.issue_type;
      const result = await createBookingRequest({ ...form, issue_description, photo_url: photoUrl });
      setDone(result);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 className="mt-4 font-heading text-2xl font-extrabold">Booking received</h2>
        <p className="mt-2 text-muted-foreground">
          Thanks {done.job?.customer_name?.split(" ")?.[0] || "there"} — your request {done.job?.reference && <span className="font-semibold text-foreground">{done.job.reference}</span>} has been sent to our team.
        </p>
        <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your private tracking link</p>
          <p className="mt-2 break-all text-sm text-foreground">{done.trackingLink}</p>
          <p className="mt-2 text-xs text-muted-foreground">Keep this link safe. Anyone with it can view and manage this booking.</p>
        </div>
        <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={copyLink} variant="outline" className="gap-2"><Copy className="h-4 w-4" /> Copy link</Button>
          <Button asChild><Link to={done.trackingPath || "/"}>Track my job</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-busy={submitting} className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-extrabold">Repair booking details</h2>
        <p className="mt-2 text-sm text-muted-foreground">No account needed. We’ll create a private tracking link for this job.</p>
      </div>

      <div className={submitting ? "space-y-5 opacity-60 pointer-events-none" : "space-y-5"}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name" required><Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} required /></Field>
        <Field label={field("phone").label || "Phone"} required><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></Field>
      </div>
      <Field label={field("email").label || "Email"} required><Input type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} required /></Field>

      <Field label={field("asset_label").label || "Scooter"} required>
        <AssetBrandPicker
          make={form.asset_make}
          model={form.asset_model}
          customMake={form.asset_custom_make}
          customModel={form.asset_custom_model}
          onChange={({ make, model, customMake, customModel, label }) => setForm((f) => ({ ...f, asset_make: make, asset_model: model, asset_custom_make: customMake, asset_custom_model: customModel, asset_label: label }))}
        />
        {form.asset_make && form.asset_make !== "Other" && form.asset_model && !modelMatchesBrand && <p className="text-sm text-destructive">The selected model doesn't belong to {form.asset_make}.</p>}
      </Field>

      <Field label={field("issue_description").label || "Issue"} required>
        <Select value={form.issue_type} onValueChange={(v) => set("issue_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select a service…" /></SelectTrigger>
          <SelectContent>
            {services.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        {isOther && <Textarea value={form.issue_description} onChange={(e) => set("issue_description", e.target.value)} placeholder={field("issue_description").placeholder} className="h-24 mt-2" required />}
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={field("preferred_date").label || "Preferred date"}>
          <Input type="date" value={form.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} disabled={form.asap} className={form.asap ? "opacity-50" : ""} />
          <label className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <Checkbox checked={form.asap} onCheckedChange={(v) => setForm((f) => ({ ...f, asap: !!v, preferred_date: v ? "" : f.preferred_date }))} />
            <span>ASAP — as soon as possible</span>
          </label>
        </Field>
        <Field label={field("preferred_time_window").label || "Preferred time"}>
          <Select value={form.preferred_time_window} onValueChange={(v) => set("preferred_time_window", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{options("preferred_time_window").map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      <Field label={field("rideable").label || "Is it rideable?"}>
        <Select value={form.rideable ? "yes" : "no"} onValueChange={(v) => set("rideable", v === "yes")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{options("rideable").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>

      <Field label={field("photo").label || "Photo"}>
        <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-accent transition-colors">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {photoUrl ? "Photo uploaded ✓" : "Upload a photo of the issue"}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </label>
      </Field>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <Checkbox checked={form.consent} onCheckedChange={(v) => set("consent", !!v)} className="mt-0.5" />
        <span>I agree to be contacted about this booking and understand my tracking link should be kept private.</span>
      </label>
      </div>

      {submitting && (
        <p className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-medium text-accent flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Sending your booking request…
        </p>
      )}

      <Button type="submit" disabled={submitting || uploading || !form.consent || !form.customer_email || !form.customer_name || !form.phone || !form.asset_label || !modelMatchesBrand || !issueValid} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl disabled:cursor-not-allowed">
        {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting booking…</> : "Submit booking"}
      </Button>
    </form>
  );
}

function Field({ label, required, children }) {
  return <div className="space-y-1.5"><Label className="text-sm font-medium">{label}{required && <span className="text-accent"> *</span>}</Label>{children}</div>;
}