import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard } from "lucide-react";
import { CUSTOMER_JOURNEY } from "@/config/businessConfig";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import ScrollReveal from "./ScrollReveal";

const ICONS = { CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard };

// Step-specific colours for the timeline
const STEP_COLORS = [
  { dot: "bg-slate-400",   ring: "ring-slate-200",   icon: "bg-slate-100 text-slate-700"   },
  { dot: "bg-indigo-400",  ring: "ring-indigo-200",  icon: "bg-indigo-100 text-indigo-700"  },
  { dot: "bg-violet-400",  ring: "ring-violet-200",  icon: "bg-violet-100 text-violet-700"  },
  { dot: "bg-violet-500",  ring: "ring-violet-200",  icon: "bg-violet-100 text-violet-700"  },
  { dot: "bg-amber-400",   ring: "ring-amber-200",   icon: "bg-amber-100 text-amber-700"    },
  { dot: "bg-teal-500",    ring: "ring-teal-200",    icon: "bg-teal-100 text-teal-700"      },
  { dot: "bg-emerald-500", ring: "ring-emerald-200", icon: "bg-emerald-100 text-emerald-700"},
  { dot: "bg-emerald-600", ring: "ring-emerald-200", icon: "bg-emerald-100 text-emerald-700"},
];

export default function JourneySection() {
  const { data: { app } } = usePlatformConfig();
  const [hovered, setHovered] = useState(null);

  return (
    <section id="journey" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-secondary/35" />
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

        {/* Timeline grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_JOURNEY.map((item, i) => {
            const Icon = ICONS[item.icon];
            const colors = STEP_COLORS[i] || STEP_COLORS[0];
            const isHovered = hovered === i;

            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                onHoverStart={() => setHovered(i)}
                onHoverEnd={() => setHovered(null)}
                className="relative"
              >
                {/* Connector line (lg only, not on last item) */}
                {i % 4 !== 3 && (
                  <div className="absolute top-7 left-full w-6 hidden lg:block">
                    <div className="h-px w-full bg-border mt-[-1px]" />
                  </div>
                )}

                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="h-full rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-border/80 transition-shadow cursor-default"
                >
                  {/* Step number + icon row */}
                  <div className="flex items-center gap-3">
                    <span className={`grid place-items-center h-11 w-11 rounded-2xl shrink-0 transition-all duration-300 ${isHovered ? `${colors.icon} ring-4 ${colors.ring}` : colors.icon}`}>
                      {Icon && <Icon className="h-5 w-5" />}
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      Step {i + 1}
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-heading text-sm font-bold text-foreground leading-snug">
                    {item.label}
                  </h3>

                  {/* Animated status dot */}
                  <div className="mt-3 flex items-center gap-2">
                    <motion.span
                      className={`h-2 w-2 rounded-full ${colors.dot}`}
                      animate={isHovered ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                      transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {i === 0 ? "Customer submits" :
                       i === 1 ? "Staff confirmed" :
                       i === 2 ? "Full assessment" :
                       i === 3 ? "Transparent pricing" :
                       i === 4 ? "Customer decides" :
                       i === 5 ? "Work underway" :
                       i === 6 ? "Collection ready" :
                       "Payment cleared"}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Trust bar */}
        <ScrollReveal delay={0.2} className="mt-14">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground border-t border-border pt-10">
            {[
              "Real-time status updates",
              "Quote approval before work starts",
              "Full job audit trail",
              "Customer portal access",
            ].map((t) => (
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