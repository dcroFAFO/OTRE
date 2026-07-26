import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import HeroCarousel from "@/components/landing/HeroCarousel";

export default function HeroSection({ sectionRef }) {
  const { data: { business, app } } = usePlatformConfig();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const foregroundY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, -120]);

  return (
    <section ref={sectionRef} id="top" className="relative flex min-h-[calc(100svh-3.5rem)] items-center overflow-hidden pb-14 pt-24 sm:min-h-[90vh] sm:pb-28 sm:pt-32">
      <motion.div style={{ y: foregroundY }} className="relative w-full will-change-transform">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroCarousel>
            <div className="mt-7 grid gap-3 sm:flex sm:flex-row sm:flex-wrap">
              <Link to="/book" className="w-full sm:w-auto">
                <Button size="lg" className="h-12 w-full gap-2 rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90 sm:h-11 sm:w-auto">
                  {business.primaryCta.label} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#services" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="h-12 w-full rounded-xl border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white sm:h-11 sm:w-auto">
                  {business.secondaryCta.label}
                </Button>
              </a>
            </div>
          </HeroCarousel>

          <div className="mx-auto mt-7 grid max-w-7xl gap-2.5 px-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 sm:px-8">
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