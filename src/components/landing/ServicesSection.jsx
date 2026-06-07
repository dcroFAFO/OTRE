import React from "react";
import { motion } from "framer-motion";
import { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag, Truck } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import ScrollReveal from "./ScrollReveal";

const ICONS = { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag, Truck };

const CATEGORY_ACCENTS = {
  Diagnostics: "from-violet-50 to-transparent hover:from-violet-100",
  Repairs:     "from-rose-50 to-transparent hover:from-rose-100",
  Power:       "from-amber-50 to-transparent hover:from-amber-100",
  Maintenance: "from-teal-50 to-transparent hover:from-teal-100",
  Parts:       "from-indigo-50 to-transparent hover:from-indigo-100",
  Sales:       "from-emerald-50 to-transparent hover:from-emerald-100",
  Booking:     "from-sky-50 to-transparent hover:from-sky-100",
};
const CATEGORY_ICON_COLORS = {
  Diagnostics: "bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white",
  Repairs:     "bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white",
  Power:       "bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white",
  Maintenance: "bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white",
  Parts:       "bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white",
  Sales:       "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",
  Booking:     "bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white",
};

export default function ServicesSection() {
  const { data: { services, app } } = usePlatformConfig();

  return (
    <section id="services" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal>
          <span className="text-sm font-semibold text-accent tracking-wide uppercase">{app.landing.servicesEyebrow}</span>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-2xl">
            {app.landing.servicesTitle}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
            {app.landing.servicesBody}
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => {
            const Icon = ICONS[s.icon] || Wrench;
            const accentGrad = CATEGORY_ACCENTS[s.category] || "from-secondary to-transparent hover:from-secondary/80";
            const iconColor = CATEGORY_ICON_COLORS[s.category] || "bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground";

            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg hover:shadow-primary/6 hover:-translate-y-1 transition-all duration-200"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${accentGrad} transition-all duration-300 pointer-events-none`} />
                <div className="relative p-6">
                  <span className={`grid place-items-center h-11 w-11 rounded-2xl transition-all duration-300 ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{s.category}</p>
                  <h3 className="mt-1 font-heading text-base font-bold text-foreground leading-snug">{s.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}