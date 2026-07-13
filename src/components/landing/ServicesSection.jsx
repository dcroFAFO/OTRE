import React from "react";
import { motion } from "framer-motion";
import { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag, ArrowRight } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import ScrollReveal from "./ScrollReveal";

const ICONS = { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag };

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

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => {
            const Icon = ICONS[s.icon] || Wrench;

            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-gentle hover:-translate-y-1.5 hover:border-accent/40 transition-all duration-300 ease-out"
              >
                {/* Top accent bar */}
                <div className="absolute top-0 inset-x-0 h-[3px] bg-accent origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />

                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Shine sweep */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute -inset-y-4 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[300%] transition-all duration-700 ease-out" />
                </div>

                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <span className="grid place-items-center h-12 w-12 rounded-2xl bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ease-out">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="grid place-items-center h-7 w-7 rounded-full bg-transparent text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:bg-accent/10 group-hover:text-accent transition-all duration-300 ease-out translate-x-1 group-hover:translate-x-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <p className="mt-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{s.category}</p>
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