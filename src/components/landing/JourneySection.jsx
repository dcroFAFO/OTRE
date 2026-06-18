import React from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Search, Wrench, PackageCheck } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import ScrollReveal from "./ScrollReveal";

// Simplified to 4 high-level stages — the booking & service offering are the
// focus, so this is a light-touch reassurance strip rather than the main event.
const STEPS = [
  { icon: CalendarCheck, label: "Book it in", sub: "Tell us the issue, pick a time" },
  { icon: Search, label: "We assess", sub: "Full diagnostic & fixed-price quote" },
  { icon: Wrench, label: "We fix it", sub: "Repaired by e-scooter specialists" },
  { icon: PackageCheck, label: "Pick it up", sub: "Ready to ride, work guaranteed" },
];

export default function JourneySection() {
  const { data: { app } } = usePlatformConfig();

  return (
    <section id="journey" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-card/40" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal>
          <span className="text-sm font-semibold text-accent tracking-wide uppercase">{app.landing.journeyEyebrow}</span>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-2xl">
            {app.landing.journeyTitle}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
            {app.landing.journeyBody}
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (i % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative group"
              >
                {i !== STEPS.length - 1 && (
                  <div className="absolute top-7 left-full w-6 hidden lg:block">
                    <div className="h-px w-full bg-border" />
                  </div>
                )}

                <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-accent/30 hover:shadow-gentle hover:-translate-y-1 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <span className="grid place-items-center h-11 w-11 rounded-2xl bg-accent/15 text-accent shrink-0">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      Step {i + 1}
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-heading text-sm font-bold text-foreground leading-snug">
                    {item.label}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{item.sub}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <ScrollReveal delay={0.2} className="mt-14">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground border-t border-border pt-10">
            {["All major brands serviced", "Transparent fixed-price quotes", "Genuine & compatible parts", "Work guaranteed"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}