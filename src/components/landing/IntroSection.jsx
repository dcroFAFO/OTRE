import React from "react";
import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

const STATS = [
  { value: "100%", label: "Scooter-focused" },
  { value: "Online", label: "Job tracking" },
  { value: "Fast", label: "Turnaround" },
  { value: "Brisbane", label: "Local workshop" },
];

export default function IntroSection() {
  return (
    <section className="border-y border-border/70 bg-card/35 py-14 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <ScrollReveal className="max-w-3xl">
          <span className="text-sm font-semibold text-accent tracking-wide uppercase">Electric Scooter Repairs</span>
          <h2 className="mt-3 max-w-[18ch] font-heading text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Electric Scooter Repairs That Keep You Moving
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
            On The Run Electrics provides practical repairs and servicing for electric scooters, from everyday maintenance to fault finding and electrical issues. Whether your scooter has lost power, needs new tyres, has braking problems, or simply needs a proper service, we help get it sorted without the runaround.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Booking online is quick, and once your repair is underway, you can track the progress of your job from start to finish.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-12 sm:grid-cols-4 sm:gap-4">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:border-accent/30 hover:shadow-gentle sm:p-5 sm:text-center"
              >
                <p className="font-heading text-2xl sm:text-3xl font-extrabold text-accent">{stat.value}</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}