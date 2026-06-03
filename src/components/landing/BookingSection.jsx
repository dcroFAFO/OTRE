import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Upload, CalendarCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createBookingRequest } from "@/services/bookingService";

const TIME_WINDOWS = ["Morning (9–12)", "Midday (12–3)", "Afternoon (3–5:30)", "Anytime"];
const LOCATIONS = [
  { v: "drop_off", l: "I'll drop it off" },
  { v: "pickup", l: "Please pick it up" },
  { v: "onsite", l: "On-site / mobile" },
];

const EMPTY = {
  customer_name: "", phone: "", email: "", scooter_label: "", issue_description: "",
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
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-accent/30 bg-card p-10 text-center shadow-xl"
          >
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h2 className="mt-5 font-heading text-2xl font-extrabold text-foreground">Booking request received!</h2>
            <p className="mt-2 text-muted-foreground">
              Thanks {done.customer_name?.split(" ")[0]} — your request <span className="font-semibold text-foreground">{done.reference}</span> is now <span className="font-semibold">Requested</span>. Our team will review it and confirm your appointment shortly.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">You'll receive updates by email and can track progress in the customer portal.</p>
            <Button className="mt-6" variant="outline" onClick={() => { setDone(null); setForm(EMPTY); setPhotoUrl(null); }}>
              Submit another request
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="book" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent"><CalendarCheck className="h-4 w-4" /> Book a Technician</span>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Tell us about your scooter</h2>
          <p className="mt-3 text-muted-foreground">Fill this in and we'll get back to confirm a time. No payment needed to book.</p>
        </div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-10 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Your name" required>
              <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Liam Carter" required />
            </Field>
            <Field label="Phone" required>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="04xx xxx xxx" required />
            </Field>
          </div>
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" required />
          </Field>
          <Field label="Scooter make / model" required>
            <Input value={form.scooter_label} onChange={(e) => set("scooter_label", e.target.value)} placeholder="Segway Ninebot Max G30" required />
          </Field>
          <Field label="What's the issue?" required>
            <Textarea value={form.issue_description} onChange={(e) => set("issue_description", e.target.value)} placeholder="Rear tyre puncture and brakes feel loose..." className="h-24" required />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Preferred date">
              <Input type="date" value={form.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} />
            </Field>
            <Field label="Preferred time">
              <Select value={form.preferred_time_window} onValueChange={(v) => set("preferred_time_window", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIME_WINDOWS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Drop-off preference">
              <Select value={form.location_preference} onValueChange={(v) => set("location_preference", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Is the scooter rideable?">
              <Select value={form.rideable ? "yes" : "no"} onValueChange={(v) => set("rideable", v === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes, it rides</SelectItem>
                  <SelectItem value="no">No, it won't ride</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Photo (optional)">
            <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-accent transition-colors">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {photoUrl ? "Photo uploaded ✓" : "Upload a photo of the issue"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </Field>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Checkbox checked={form.consent} onCheckedChange={(v) => set("consent", !!v)} className="mt-0.5" />
            <span>I confirm the details are correct and consent to being contacted about this booking.</span>
          </label>

          <Button type="submit" disabled={submitting || !form.consent} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Request Booking"}
          </Button>
        </motion.form>
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