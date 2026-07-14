import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

export default function HeroSection({ sectionRef }) {
  const { data: { business, app } } = usePlatformConfig();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const foregroundY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, -120]);

  return (
    <section ref={sectionRef} id="top" className="relative flex min-h-[calc(100svh-3.5rem)] items-center overflow-hidden pb-14 pt-24 sm:min-h-[90vh] sm:pb-28 sm:pt-36">
      <motion.div style={{ y: foregroundY }} className="relative mx-auto w-full max-w-7xl px-4 will-change-transform sm:px-8">
        <motion.div className="max-w-2xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
            <Zap className="h-3.5 w-3.5" />
            {app.landing.heroEyebrow}
          </span>

          <h1 className="mt-5 max-w-[12ch] font-heading text-4xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:max-w-none sm:text-5xl lg:text-[3.25rem]">
            {business.name}
          </h1>

          <p className="mt-4 max-w-sm font-heading text-lg font-bold leading-snug text-foreground sm:text-2xl">
            {business.tagline}
          </p>

          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
            {business.subheading}
          </p>

          <div className="mt-7 grid gap-3 sm:mt-8 sm:flex sm:flex-row sm:flex-wrap">
            <Link to="/book" className="w-full sm:w-auto">
              <Button size="lg" className="h-12 w-full gap-2 rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90 sm:h-10 sm:w-auto">
                {business.primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#services" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-12 w-full rounded-xl sm:h-10 sm:w-auto">
                {business.secondaryCta.label}
              </Button>
            </a>
          </div>

          <div className="mt-7 grid gap-2.5 sm:mt-8 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
            {app.landing.heroBenefits.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> {t}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}