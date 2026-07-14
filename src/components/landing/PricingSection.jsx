import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Star, Zap, Wrench, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

const TIERS = [
  {
    name: "Diagnostic Check",
    icon: Zap,
    price: "From $55",
    blurb: "Identify the issue before committing to a repair.",
    features: [
      "Full diagnostic inspection",
      "Battery & charging test",
      "Brake & tyre safety check",
      "Fault code readout",
      "Repair recommendations",
    ],
    cta: "Book a diagnostic",
    highlighted: false,
  },
  {
    name: "Standard Repair",
    icon: Wrench,
    price: "From $120",
    blurb: "Most common repairs — brakes, tyres, electrical fixes.",
    features: [
      "Everything in Diagnostic",
      "Puncture & tyre replacement",
      "Brake pad adjustment / replacement",
      "Throttle & controller checks",
      "Wiring & light repairs",
      "Online job tracking",
    ],
    cta: "Book a repair",
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Full Service",
    icon: ShieldCheck,
    price: "From $180",
    blurb: "Comprehensive service for peace of mind on every ride.",
    features: [
      "Everything in Standard Repair",
      "Full safety inspection",
      "Bolt & fastener torque check",
      "Folding mechanism service",
      "Suspension check & lubrication",
      "Battery health report",
    ],
    cta: "Book a full service",
    highlighted: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="border-y border-border/70 bg-card/35 py-14 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-left sm:text-center">
          <span className="text-sm font-semibold text-accent tracking-wide uppercase">Pricing</span>
          <h2 className="mt-3 font-heading text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Transparent Service Pricing
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Clear pricing tiers for every repair need. Final quotes are confirmed after inspection — no surprises, no hidden costs.
          </p>
        </ScrollReveal>

        <div className="mt-9 grid gap-5 sm:mt-12 lg:grid-cols-3">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon;
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={`relative rounded-3xl border bg-card p-5 transition-all duration-300 sm:p-7 ${
                  tier.highlighted
                    ? "border-accent shadow-gentle lg:scale-[1.03] lg:-translate-y-1"
                    : "border-border shadow-sm hover:border-accent/30 hover:shadow-gentle"
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-md">
                    <Star className="h-3 w-3 fill-current" /> {tier.badge}
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <span className={`grid place-items-center h-11 w-11 rounded-2xl transition-colors ${
                    tier.highlighted
                      ? "bg-accent text-accent-foreground"
                      : "bg-accent/15 text-accent"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">{tier.name}</h3>
                </div>

                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{tier.blurb}</p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-heading text-3xl font-extrabold text-foreground">{tier.price}</span>
                </div>

                <div className="mt-5 h-px bg-border" />

                <ul className="mt-5 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span className={`grid place-items-center h-5 w-5 rounded-full shrink-0 mt-0.5 ${
                        tier.highlighted ? "bg-accent text-accent-foreground" : "bg-accent/15 text-accent"
                      }`}>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-sm text-foreground leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/book" className="mt-6 block">
                  <Button
                    className={`w-full rounded-xl gap-2 ${
                      tier.highlighted
                        ? "bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20"
                        : ""
                    }`}
                    variant={tier.highlighted ? "default" : "outline"}
                  >
                    {tier.cta} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <ScrollReveal delay={0.15}>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Prices are starting points. Final quotes confirmed after inspection. No work begins without your approval.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}