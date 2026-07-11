import React from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CheckCircle2, Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
const ICONS = { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag };

// A clean grid of the actual services offered — keeps the hero focused on what we do.
function ServicesVisual({ services }) {
  const items = services.slice(0, 6);
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {items.map((s, i) => {
        const Icon = ICONS[s.icon] || Wrench;
        return (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="group rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-gentle hover:border-accent/30 transition-all duration-200"
          >
            <span className="grid place-items-center h-10 w-10 rounded-xl bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-200">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-heading text-sm font-bold text-foreground leading-snug">{s.name}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function HeroSection() {
  const { data: { business, app, services } } = usePlatformConfig();
  const sectionRef = React.useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const foregroundY = useTransform(scrollYProgress, [0, 1], [0, -120]);

  return (
    <section ref={sectionRef} id="top" className="relative overflow-hidden pt-24 pb-20 sm:pt-36 sm:pb-28 min-h-[90vh] flex items-center">
      <motion.div style={{ y: foregroundY }} className="relative mx-auto max-w-7xl px-5 sm:px-8 w-full grid lg:grid-cols-2 gap-10 lg:gap-16 items-center will-change-transform">
        {/* Left: Copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
            <Zap className="h-3.5 w-3.5" />
            {app.landing.heroEyebrow}
          </span>

          <h1 className="mt-5 font-heading text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.1] tracking-tight text-foreground">
            Electric Scooter Repairs in Brisbane
          </h1>

          <p className="mt-4 text-xl sm:text-2xl font-heading font-bold text-foreground">
            {business.tagline}
          </p>

          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-lg">
            {business.subheading}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
            <Link to="/book" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl shadow-lg shadow-accent/20">
                {business.primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#services" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-xl">
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

        {/* Right: services grid — shown on sm+ only */}
        <div className="hidden lg:block">
          <ServicesVisual services={services} />
        </div>
      </motion.div>
    </section>
  );
}