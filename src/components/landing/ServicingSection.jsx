import React from "react";
import { Wrench } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

export default function ServicingSection() {
  return (
    <section id="servicing" className="py-20 sm:py-28 bg-card/35 border-y border-border/70">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal className="max-w-3xl">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent tracking-wide uppercase">
            <Wrench className="h-4 w-4" /> Maintenance
          </span>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Servicing & Maintenance
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed text-lg">
            Regular servicing helps prevent small problems from becoming bigger, more expensive repairs. A service can include checking brakes, tyres, bolts, wiring, lights, folding mechanisms, suspension, battery condition, and general ride safety.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            It is a simple way to keep your scooter reliable, especially if you use it often for commuting, delivery work, or daily transport.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}