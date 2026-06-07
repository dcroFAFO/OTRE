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

const field = (key) => DEFAULT_BOOKING_FIELDS.find((f) => f.key === key) || {};
const options = (key) => field(key).options || [];

const EMPTY = {
  customer_name: "", phone: "", email: "", asset_label: "", issue_description: "",
  preferred_date: "", preferred_time_window: "Anytime", rideable: true,
  location_preference: "drop_off", consent: false,
};

export default function BookingSection() {
  const [form, setForm] = useState(EMPTY);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
    if (!form.consent) return;
    setSubmitting(true);
    const job = await createBookingRequest({ ...form, photo_url: photoUrl });
    setSubmitting(false);
    setDone(job);
  };

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
          className="mt-10 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={field("customer_name").label} required>
              <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder={field("customer_name").placeholder} required />
            </Field>
            <Field label={field("phone").label} required>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder={field("phone").placeholder} required />
            </Field>
          </div>
          <Field label={field("email").label} required>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={field("email").placeholder} required />
          </Field>
          <Field label={field("asset_label").label} required>
            <Input value={form.asset_label} onChange={(e) => set("asset_label", e.target.value)} placeholder={field("asset_label").placeholder} required />
          </Field>
          <Field label={field("issue_description").label} required>
            <Textarea value={form.issue_description} onChange={(e) => set("issue_description", e.target.value)} placeholder={field("issue_description").placeholder} className="h-24" required />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={field("preferred_date").label}>
              <Input type="date" value={form.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} />
            </Field>
            <Field label={field("preferred_time_window").label}>
              <Select value={form.preferred_time_window} onValueChange={(v) => set("preferred_time_window", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{options("preferred_time_window").map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={field("location_preference").label}>
              <Select value={form.location_preference} onValueChange={(v) => set("location_preference", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{options("location_preference").map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
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

          <Button type="submit" disabled={submitting || !form.consent} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
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