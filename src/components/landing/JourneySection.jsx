import React from "react";
import { motion } from "framer-motion";
import { CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard } from "lucide-react";
import { CUSTOMER_JOURNEY } from "@/config/businessConfig";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import ScrollReveal from "./ScrollReveal";

const ICONS = { CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard };

const STEP_COLORS = [
  { dot: "bg-slate-400",   icon: "bg-slate-100 text-slate-700"    },
  { dot: "bg-indigo-400",  icon: "bg-indigo-100 text-indigo-700"  },
  { dot: "bg-violet-400",  icon: "bg-violet-100 text-violet-700"  },
  { dot: "bg-violet-500",  icon: "bg-violet-100 text-violet-700"  },
  { dot: "bg-amber-400",   icon: "bg-amber-100 text-amber-700"    },
  { dot: "bg-teal-500",    icon: "bg-teal-100 text-teal-700"      },
  { dot: "bg-emerald-500", icon: "bg-emerald-100 text-emerald-700"},
  { dot: "bg-emerald-600", icon: "bg-emerald-100 text-emerald-700"},
];

const STEP_SUBTITLES = [
  "Customer submits", "Staff confirmed", "Full assessment", "Transparent pricing",
  "Customer decides", "Work underway", "Collection ready", "Payment cleared",
];

export default function JourneySection() {
  const { data: { app } } = usePlatformConfig();

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

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_JOURNEY.map((item, i) => {
            const Icon = ICONS[item.icon];
            const colors = STEP_COLORS[i] || STEP_COLORS[0];

            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (i % 4) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="relative group"
              >
                {/* Connector line (lg only, not last in row) */}
                {i % 4 !== 3 && (
                  <div className="absolute top-7 left-full w-6 hidden lg:block">
                    <div className="h-px w-full bg-border" />
                  </div>
                )}

                <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default">
                  <div className="flex items-center gap-3">
                    <span className={`grid place-items-center h-11 w-11 rounded-2xl shrink-0 ${colors.icon}`}>
                      {Icon && <Icon className="h-5 w-5" />}
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      Step {i + 1}
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-heading text-sm font-bold text-foreground leading-snug">
                    {item.label}
                  </h3>

                  <div className="mt-3 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${colors.dot}`} />
                    <span className="text-xs text-muted-foreground">{STEP_SUBTITLES[i]}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <ScrollReveal delay={0.2} className="mt-14">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground border-t border-border pt-10">
            {["Real-time status updates", "Quote approval before work starts", "Full job audit trail", "Customer portal access"].map((t) => (
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