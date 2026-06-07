import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CheckCircle2, CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard } from "lucide-react";
import { CUSTOMER_JOURNEY, DEFAULT_DEMO_PREVIEW_JOB } from "@/config/businessConfig";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

const ICONS = { CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard };

// Reduced: only 6 cards, simplified positioning, no per-card infinite loops
const CARD_LAYOUT = [
  { top: "4%",   left: "4%",   delay: 0.05, entryX: -16 },
  { top: "8%",   right: "3%",  delay: 0.12, entryX: 16  },
  { top: "32%",  left: "1%",   delay: 0.18, entryX: -16 },
  { top: "34%",  right: "2%",  delay: 0.24, entryX: 16  },
  { bottom: "12%", left: "3%", delay: 0.30, entryX: -16 },
  { bottom: "10%", right: "4%",delay: 0.36, entryX: 16  },
];

function FloatingJourneyCard({ item, layout }) {
  const Icon = ICONS[item.icon];
  return (
    <motion.div
      className="absolute"
      style={{ top: layout.top, bottom: layout.bottom, left: layout.left, right: layout.right }}
      initial={{ opacity: 0, x: layout.entryX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: layout.delay, duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-white/90 px-3.5 py-2.5 shadow-lg whitespace-nowrap select-none">
        <span className="grid place-items-center h-7 w-7 rounded-xl bg-secondary text-primary shrink-0">
          {Icon && <Icon className="h-3.5 w-3.5" />}
        </span>
        <span className="text-xs font-semibold text-foreground">{item.label}</span>
      </div>
    </motion.div>
  );
}

function LiveJobPreview() {
  const [step, setStep] = useState(2);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % CUSTOMER_JOURNEY.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-x-[12%] top-1/2 -translate-y-1/2 z-20 rounded-3xl border border-border bg-card/98 p-5 shadow-2xl shadow-primary/10"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] text-muted-foreground font-medium">Job {DEFAULT_DEMO_PREVIEW_JOB.reference}</p>
          <p className="font-heading font-bold text-sm text-foreground leading-tight">{DEFAULT_DEMO_PREVIEW_JOB.assetLabel}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-accent/12 border border-accent/20 px-2.5 py-1 text-[11px] font-semibold text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Live
        </span>
      </div>

      <div className="space-y-2">
        {CUSTOMER_JOURNEY.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <div key={s.key} className="flex items-center gap-2.5">
              <span
                className="h-2 w-2 rounded-full shrink-0 transition-colors duration-300"
                style={{
                  backgroundColor: done || current ? "hsl(172 66% 42%)" : "hsl(214 32% 91%)",
                  opacity: done ? 0.7 : current ? 1 : 0.4,
                  transform: current ? "scale(1.4)" : "scale(1)",
                  transition: "transform 0.3s, background-color 0.3s",
                }}
              />
              <span className={`text-xs leading-tight transition-colors ${current ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                style={{ opacity: i > step + 1 ? 0.4 : 1 }}>
                {s.label}
              </span>
              {current && (
                <span className="ml-auto text-[10px] font-semibold text-accent bg-accent/10 rounded-full px-2 py-0.5">Now</span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Only rendered on sm+ — avoids running animations on mobile entirely
function HeroVisual() {
  const displayItems = CUSTOMER_JOURNEY.slice(0, 6);
  return (
    <div className="relative h-[460px] sm:h-[520px]">
      {displayItems.map((item, i) => (
        <FloatingJourneyCard key={item.key} item={item} layout={CARD_LAYOUT[i]} />
      ))}
      <LiveJobPreview />
    </div>
  );
}

export default function HeroSection() {
  const { data: { business, app } } = usePlatformConfig();

  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-20 sm:pt-36 sm:pb-28 min-h-[90vh] flex items-center">
      {/* Static background — no parallax transform */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 otr-grid-bg opacity-30" />
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-accent/8 blur-[80px]" />
        <div className="absolute top-60 -left-48 h-[400px] w-[400px] rounded-full bg-primary/6 blur-[70px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left: Copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/8 px-3.5 py-1 text-xs font-semibold text-accent">
            <Zap className="h-3.5 w-3.5" />
            {app.landing.heroEyebrow}
          </span>

          <h1 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.06] tracking-tight text-foreground">
            {business.tagline}
          </h1>

          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-lg">
            {business.subheading}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#book">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl shadow-lg shadow-accent/20">
                {business.primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <a href="#services">
              <Button size="lg" variant="outline" className="rounded-xl">
                {business.secondaryCta.label}
              </Button>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            {app.landing.heroBenefits.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right: only rendered on sm+ to avoid hidden animation cost on mobile */}
        <div className="hidden sm:block">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}