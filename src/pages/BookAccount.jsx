import React from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import PublicBookingForm from "@/components/booking/PublicBookingForm";
import { CheckCircle2, ClipboardList, FileCheck2, ShieldCheck } from "lucide-react";

const BENEFITS = [
  { icon: ClipboardList, title: "Share the repair details", body: "Tell us the symptoms, damage, error codes, or rideability issues before inspection." },
  { icon: ShieldCheck, title: "Review and next steps", body: "We’ll assess the details and confirm what happens next for your scooter." },
  { icon: FileCheck2, title: "Track the repair", body: "Use your job tracking button to follow updates as the repair progresses." },
];

export default function BookAccount() {
  return (
    <>
      <SEO
        title="Book Your Scooter Repair | On The Run Electrics"
        description="Submit your electric scooter repair details so On The Run Electrics can assess the issue and manage the repair process."
        canonical="/book"
        noindex
      />
      <main className="min-h-screen bg-background text-foreground">
        <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 otr-grid-bg opacity-[0.16]" />
            <div className="absolute -top-36 -right-32 h-[460px] w-[460px] rounded-full bg-accent/15 blur-[90px]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-5 sm:px-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-start">
            <div className="lg:sticky lg:top-24">
              <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">← Back to home</Link>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
                <CheckCircle2 className="h-3.5 w-3.5" /> Repair assessment request
              </div>
              <h1 className="mt-5 font-heading text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Book Your Scooter Repair
              </h1>
              <div className="mt-5 space-y-4 text-lg text-muted-foreground leading-relaxed max-w-2xl">
                <p>Tell us what is happening with your electric scooter and provide a few details about the repair you need. This helps On The Run Electrics understand the issue before your scooter is inspected.</p>
                <p>Once your request is submitted, we will review the details, confirm the next steps, and keep you updated as the job progresses.</p>
              </div>
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                <p>The more detail you provide, the easier it is to understand the issue. Include any symptoms, error codes, strange noises, charging problems, rideability issues, or recent damage.</p>
                <p className="mt-2 font-medium">If your scooter is unsafe to ride, losing power, has brake issues, exposed wiring, battery swelling, smoke, or a burning smell, do not continue riding it. Book it in for inspection.</p>
              </div>
              <div className="mt-8 grid gap-3">
                {BENEFITS.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <article key={benefit.title} className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
                      <div className="flex gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent shrink-0"><Icon className="h-5 w-5" /></span>
                        <div><h3 className="font-heading text-sm font-extrabold">{benefit.title}</h3><p className="mt-1 text-sm text-muted-foreground leading-relaxed">{benefit.body}</p></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <PublicBookingForm />
          </div>
        </section>
      </main>
    </>
  );
}