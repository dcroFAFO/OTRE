import React from "react";
import { motion } from "framer-motion";
import { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag, Truck, Wrench as Fallback } from "lucide-react";
import { DEFAULT_SERVICES } from "@/config/businessConfig";

const ICONS = { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag, Truck };

export default function ServicesSection() {
  return (
    <section id="services" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <span className="text-sm font-semibold text-accent">What we do</span>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Everything your scooter needs, in one place
          </h2>
          <p className="mt-3 text-muted-foreground">
            From quick puncture fixes to full electrical diagnostics and brand-new scooters — handled by people who know e-scooters inside out.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEFAULT_SERVICES.map((s, i) => {
            const Icon = ICONS[s.icon] || Fallback;
            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                whileHover={{ y: -6 }}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-xl hover:shadow-primary/5"
              >
                <span className="grid place-items-center h-12 w-12 rounded-2xl bg-secondary text-primary group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-2 text-xs font-medium text-accent">{s.category}</p>
                <h3 className="mt-1 font-heading text-lg font-bold text-foreground">{s.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}