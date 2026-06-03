import React from "react";
import { motion } from "framer-motion";
import { CUSTOMER_JOURNEY } from "@/config/businessConfig";
import JourneyCard from "./JourneyCard";

export default function JourneySection() {
  return (
    <section id="journey" className="relative py-20 sm:py-28 bg-secondary/40 border-y border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold text-accent">How it works</span>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            From drop-off to pickup — always in the loop
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every job moves through clear, tracked stages. You'll know exactly where your scooter is at all times.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_JOURNEY.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: (i % 4) * 0.07 }}
              className="relative"
            >
              <div className="mb-3 text-xs font-bold text-muted-foreground/60">Step {i + 1}</div>
              <JourneyCard item={item} active={i === 2 || i === 6} className="w-full justify-start" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}