import React from "react";
import { Link } from "react-router-dom";
import { Check, ShieldCheck, Wrench, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { icon: Zap, name: "Diagnostic check", price: "From $55", text: "Fault finding, battery and charging tests, plus repair recommendations." },
  { icon: Wrench, name: "Standard repair", price: "From $120", text: "Common tyre, brake, wiring, lighting, throttle and controller repairs.", popular: true },
  { icon: ShieldCheck, name: "Full service", price: "From $180", text: "A comprehensive safety, fastener, folding, suspension and battery check." },
];

export default function MobilePricingSection() {
  return (
    <section id="pricing" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Straightforward pricing</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight">Know the starting point before you book.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">Final quotes are confirmed after inspection. No repair work begins without your approval.</p>
        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {OPTIONS.map(({ icon: Icon, name, price, text, popular }) => (
            <article key={name} className={`relative rounded-2xl border bg-card p-5 ${popular ? "border-accent shadow-gentle" : "border-border shadow-sm"}`}>
              {popular && <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">Most popular</span>}
              <Icon className="h-6 w-6 text-accent" aria-hidden="true" /><h3 className="mt-4 font-bold">{name}</h3><p className="mt-1 text-2xl font-extrabold">{price}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p><p className="mt-4 flex items-center gap-2 text-xs font-medium"><Check className="h-4 w-4 text-accent" aria-hidden="true" /> Quote before work begins</p>
              <Link to="/book" className="mt-5 block"><Button variant={popular ? "default" : "outline"} className="h-11 w-full rounded-xl">Book {name.toLowerCase()}</Button></Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}