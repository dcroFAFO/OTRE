import React from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import PublicBookingForm from "@/components/booking/PublicBookingForm";
import { CheckCircle2, ClipboardList, FileCheck2, ShieldCheck } from "lucide-react";

const BENEFITS = [
  { icon: ClipboardList, title: "Book without an account", body: "Submit your repair request and get a private tracking link instantly." },
  { icon: ShieldCheck, title: "Secure tracking link", body: "Your job can only be opened with the private token in your link." },
  { icon: FileCheck2, title: "Approve quotes online", body: "When a quote is ready, you can review and respond from the tracking page." },
];

export default function BookAccount() {
  return (
    <>
      <SEO
        title="Book Scooter Repair | OTR Scooters"
        description="Book a scooter repair without creating an account and track your job with a private secure link."
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
                <CheckCircle2 className="h-3.5 w-3.5" /> No account required
              </div>
              <h1 className="mt-5 font-heading text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Book your scooter repair and track it privately.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Submit your repair details now. We’ll create the job for our technicians and give you a secure tracking link for updates, files, quotes and invoices.
              </p>
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