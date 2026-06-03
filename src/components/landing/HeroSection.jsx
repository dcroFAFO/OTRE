import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import { DEFAULT_BUSINESS, CUSTOMER_JOURNEY } from "@/config/businessConfig";
import JourneyCard from "./JourneyCard";

// Floating positions for the parallax journey cards (settle into place).
const FLOATS = [
  { top: "2%", left: "0%", delay: 0.1, depth: 14 },
  { top: "20%", right: "-4%", delay: 0.25, depth: -18 },
  { top: "46%", left: "-6%", delay: 0.4, depth: 22 },
  { bottom: "6%", right: "2%", delay: 0.55, depth: -12 },
];

export default function HeroSection() {
  const [activeStep, setActiveStep] = useState(2);

  useEffect(() => {
    const t = setInterval(() => setActiveStep((s) => (s + 1) % CUSTOMER_JOURNEY.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="absolute inset-0 otr-grid-bg opacity-[0.4]" />
      <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <Zap className="h-3.5 w-3.5" /> Repairs · Servicing · Sales
          </span>
          <h1 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.05] tracking-tight text-foreground">
            {DEFAULT_BUSINESS.tagline}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl">{DEFAULT_BUSINESS.subheading}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#book">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl">
                {DEFAULT_BUSINESS.primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <a href="#services">
              <Button size="lg" variant="outline" className="rounded-xl">{DEFAULT_BUSINESS.secondaryCta.label}</Button>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Track your repair live", "Approve quotes online", "Updates drop-off to pickup"].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> {t}</span>
            ))}
          </div>
        </motion.div>

        {/* Parallax journey composition + status mockup */}
        <div className="relative h-[420px] sm:h-[480px] hidden sm:block">
          {FLOATS.map((pos, i) => {
            const item = CUSTOMER_JOURNEY[i];
            return (
              <motion.div
                key={item.key}
                className="absolute z-20"
                style={{ top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right }}
                initial={{ opacity: 0, y: pos.depth, scale: 0.9 }}
                animate={{ opacity: 1, y: [pos.depth, pos.depth - 10, pos.depth] }}
                transition={{ opacity: { delay: pos.delay, duration: 0.6 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
              >
                <JourneyCard item={item} />
              </motion.div>
            );
          })}

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="absolute inset-x-8 top-1/2 -translate-y-1/2 z-10 rounded-3xl border border-border bg-card/95 backdrop-blur p-5 shadow-2xl shadow-primary/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Job OTR-1042</p>
                <p className="font-heading font-bold text-foreground">Segway Ninebot Max G30</p>
              </div>
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">Live</span>
            </div>
            <div className="mt-4 space-y-2.5">
              {CUSTOMER_JOURNEY.slice(0, 6).map((s, i) => {
                const done = i < activeStep % 6;
                const current = i === activeStep % 6;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full transition-colors ${done ? "bg-accent" : current ? "bg-accent/50 ring-2 ring-accent/30" : "bg-border"}`} />
                    <span className={`text-sm ${current ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}