import React from "react";
import { motion } from "framer-motion";
import { Wrench, Check } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const CHECKLIST = [
  "Brakes & pads",
  "Tyres & pressure",
  "Bolts & fasteners",
  "Wiring & lights",
  "Folding mechanism",
  "Suspension",
  "Battery condition",
  "General ride safety",
];

export default function ServicingSection() {
  return (
    <section id="servicing" className="py-20 sm:py-28 bg-card/35 border-y border-border/70">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <ScrollReveal>
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

          <ScrollReveal delay={0.1}>
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              <h3 className="font-heading text-base font-bold text-foreground">
                What a service includes
              </h3>
              <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {CHECKLIST.map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="grid place-items-center h-5 w-5 rounded-full bg-accent/15 text-accent shrink-0">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-sm text-foreground font-medium">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}