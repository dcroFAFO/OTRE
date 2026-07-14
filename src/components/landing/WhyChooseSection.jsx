import React from "react";
import { CheckCircle2, MessageCircle, Wrench, Smartphone } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const FEATURES = [
  { icon: Wrench, title: "Practical Repairs", text: "Focused repair work that solves the issue without unnecessary extras." },
  { icon: MessageCircle, title: "Clear Communication", text: "Straightforward updates so you know what is happening with your scooter." },
  { icon: CheckCircle2, title: "Scooter-Focused Service", text: "Repairs and servicing built around the needs of electric scooter riders." },
  { icon: Smartphone, title: "Online Job Tracking", text: "Track the status of your repair online once your job is underway." },
];

export default function WhyChooseSection() {
  return (
    <section className="py-14 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-left sm:text-center">
          <span className="text-sm font-semibold text-accent tracking-wide uppercase">Why Choose OTRE</span>
          <h2 className="mt-3 font-heading text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Why Choose On The Run Electrics?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
            We focus on clear communication, practical advice, and quality repair work. You will know what needs attention, what can wait, and what the repair is likely to involve.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Our goal is simple: get your scooter back on the road safely, without overcomplicating the process.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-heading text-base font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}