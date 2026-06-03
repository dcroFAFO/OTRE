import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CheckCircle2, CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard } from "lucide-react";
import { CUSTOMER_JOURNEY, DEFAULT_DEMO_PREVIEW_JOB } from "@/config/businessConfig";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

const ICONS = { CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard };

// Each journey card: position, z-depth, float amount, entry direction
const CARD_LAYOUT = [
  { top: "2%",  left: "5%",   depth: 1.0, floatY: -8,  delay: 0.05, entryX: -20 },
  { top: "6%",  right: "2%",  depth: 0.7, floatY: -12, delay: 0.12, entryX: 20  },
  { top: "26%", left: "0%",   depth: 1.3, floatY: -6,  delay: 0.18, entryX: -24 },
  { top: "28%", right: "4%",  depth: 0.8, floatY: -10, delay: 0.24, entryX: 22  },
  { top: "52%", left: "6%",   depth: 1.1, floatY: -9,  delay: 0.30, entryX: -18 },
  { top: "54%", right: "0%",  depth: 0.6, floatY: -14, delay: 0.36, entryX: 20  },
  { bottom:"6%",left: "2%",   depth: 0.9, floatY: -7,  delay: 0.42, entryX: -22 },
  { bottom:"4%",right: "5%",  depth: 1.2, floatY: -11, delay: 0.48, entryX: 18  },
];

function FloatingJourneyCard({ item, layout }) {
  const Icon = ICONS[item.icon];
  return (
    <motion.div
      className="absolute"
      style={{ top: layout.top, bottom: layout.bottom, left: layout.left, right: layout.right }}
      initial={{ opacity: 0, x: layout.entryX, y: 16 }}
      animate={{ opacity: 1, x: 0, y: [0, layout.floatY, 0] }}
      transition={{
        opacity: { delay: layout.delay, duration: 0.5, ease: "easeOut" },
        x:       { delay: layout.delay, duration: 0.5, ease: "easeOut" },
        y: {
          delay: layout.delay + 0.5,
          duration: 4 + layout.depth * 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
    >
      <div
        className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-white/90 backdrop-blur-sm px-3.5 py-2.5 shadow-xl shadow-primary/8 whitespace-nowrap select-none"
        style={{ transform: `scale(${0.82 + layout.depth * 0.12})` }}
      >
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
    const t = setInterval(() => setStep((s) => (s + 1) % CUSTOMER_JOURNEY.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-x-[12%] top-1/2 -translate-y-1/2 z-20 rounded-3xl border border-border bg-card/98 backdrop-blur-xl p-5 shadow-2xl shadow-primary/15"
    >
      {/* Header */}
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

      {/* Progress steps */}
      <div className="space-y-2">
        {CUSTOMER_JOURNEY.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <motion.div
              key={s.key}
              className="flex items-center gap-2.5"
              animate={{ opacity: i > step + 1 ? 0.35 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.span
                className="h-2 w-2 rounded-full shrink-0"
                animate={{
                  backgroundColor: done ? "hsl(172 66% 42%)" : current ? "hsl(172 66% 42% / 0.6)" : "hsl(214 32% 91%)",
                  scale: current ? 1.4 : 1,
                }}
                transition={{ duration: 0.4 }}
              />
              <span className={`text-xs leading-tight transition-colors ${current ? "font-semibold text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                {s.label}
              </span>
              {current && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-auto text-[10px] font-semibold text-accent bg-accent/10 rounded-full px-2 py-0.5"
                >
                  Now
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function HeroSection() {
  const { data: { business, app } } = usePlatformConfig();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const cardsY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);

  return (
    <section id="top" ref={ref} className="relative overflow-hidden pt-24 pb-20 sm:pt-36 sm:pb-28 min-h-[90vh] flex items-center">
      {/* Background layers */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 otr-grid-bg opacity-30" />
        <div className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute top-60 -left-48 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[80px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-border to-transparent" />
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left: Copy */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/8 px-3.5 py-1 text-xs font-semibold text-accent"
          >
            <Zap className="h-3.5 w-3.5" />
            {app.landing.heroEyebrow}
          </motion.span>

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
            {app.landing.heroBenefits.map((t, i) => (
              <motion.span
                key={t}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> {t}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Right: Floating cards + live job preview */}
        <motion.div
          style={{ y: cardsY }}
          className="relative h-[460px] sm:h-[520px] hidden sm:block"
        >
          {CUSTOMER_JOURNEY.map((item, i) => (
            <FloatingJourneyCard key={item.key} item={item} layout={CARD_LAYOUT[i]} />
          ))}
          <LiveJobPreview />
        </motion.div>
      </div>
    </section>
  );
}