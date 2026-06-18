import React from "react";
import { motion } from "framer-motion";
import { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import ScrollReveal from "./ScrollReveal";

const ICONS = { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag };

const CATEGORY_ACCENTS = {
  Diagnostics: "from-accent/10 to-transparent hover:from-accent/20",
  Repairs:     "from-accent/10 to-transparent hover:from-accent/20",
  Power:       "from-accent/10 to-transparent hover:from-accent/20",
  Maintenance: "from-accent/10 to-transparent hover:from-accent/20",
  Parts:       "from-accent/10 to-transparent hover:from-accent/20",
  Sales:       "from-accent/10 to-transparent hover:from-accent/20",
};
const CATEGORY_ICON_COLORS = {
  Diagnostics: "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
  Repairs:     "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
  Power:       "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
  Maintenance: "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
  Parts:       "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
  Sales:       "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
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
            const iconColor = CATEGORY_ICON_COLORS[s.category] || "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground";

            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-accent/30 hover:shadow-gentle hover:-translate-y-1 transition-all duration-200"
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