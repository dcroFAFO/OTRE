import React from "react";
import { CalendarCheck, CreditCard, PackageCheck, Wrench } from "lucide-react";

const STEPS = [
  { icon: CalendarCheck, title: "Request", text: "Tell us about your scooter and request a repair online." },
  { icon: Wrench, title: "Repair", text: "We review, schedule and complete the required repair work." },
  { icon: PackageCheck, title: "Pickup", text: "We let you know when your scooter is ready to collect." },
  { icon: CreditCard, title: "Pay", text: "Pay your invoice and get back on the road." },
];

export default function MobileProcessSection() {
  return (
    <section id="journey" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">How it works</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight">A simple path back to riding.</h2>
        <div className="mt-8 space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="flex gap-4 rounded-2xl border border-border bg-card p-4 sm:block sm:p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <div><p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Step {index + 1}</p><h3 className="mt-1 font-bold sm:mt-3">{title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}