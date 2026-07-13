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
    <section className="py-20 sm:py-28 bg-card/35 border-y border-border/70">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <ScrollReveal>
            <span className="text-sm font-semibold text-accent tracking-wide uppercase">Electric Scooter Repairs</span>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Electric Scooter Repairs That Keep You Moving
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed text-lg">
              On The Run Electrics provides practical repairs and servicing for electric scooters, from everyday maintenance to fault finding and electrical issues. Whether your scooter has lost power, needs new tyres, has braking problems, or simply needs a proper service, we help get it sorted without the runaround.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Booking online is quick, and once your repair is underway, you can track the progress of your job from start to finish.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="rounded-3xl overflow-hidden shadow-gentle border border-border">
              <img
                src="https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/1ab1bd322_generated_image.png"
                alt="On The Run Electrics repair workshop"
                className="w-full h-64 sm:h-80 object-cover"
              />
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.15}>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm hover:border-accent/30 hover:shadow-gentle transition-all duration-200"
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