import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const TESTIMONIALS = [
  {
    quote: "Booked online, dropped my scooter off, and had it back on the road within a couple of days. The job tracking meant I always knew where things were at.",
    author: "Liam C.",
    detail: "Segway Ninebot Max G30 — Brake & tyre repair",
  },
  {
    quote: "My scooter wouldn't charge at all. They diagnosed a faulty charging port and had it sorted quickly. Straightforward, no upselling, just a good repair.",
    author: "Priya S.",
    detail: "Xiaomi Pro 2 — Charging port replacement",
  },
  {
    quote: "Great local service. They explained everything clearly and the scooter rides better than it did when I bought it. Will be back for the next service.",
    author: "Marcus T.",
    detail: "Dual Motor Scooter — Full service & diagnostics",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-14 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <ScrollReveal className="max-w-3xl">
          <span className="text-sm font-semibold text-accent tracking-wide uppercase">Rider Stories</span>
          <h2 className="mt-3 font-heading text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            What Brisbane Riders Say
          </h2>
        </ScrollReveal>

        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-accent/30 hover:shadow-gentle transition-all duration-200"
            >
              <Quote className="h-7 w-7 text-accent/20" />
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground">"{t.quote}"</p>
              <div className="mt-5 border-t border-border pt-4">
                <p className="font-heading text-sm font-bold text-foreground">{t.author}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}