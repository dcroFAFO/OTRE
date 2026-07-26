import React from "react";
import { CheckCircle2, Zap } from "lucide-react";
import HeroCarousel from "@/components/landing/HeroCarousel";

export default function MobileLandingHero() {
  const benefits = ["No payment to request", "Clear repair updates", "Track your repair online"];

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-24 sm:px-8 sm:pb-20 sm:pt-32">
      <div className="relative mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Electric scooter repairs · Woolloongabba
        </div>
        <div className="mt-6">
          <HeroCarousel />
        </div>
        <div className="mt-7 grid gap-2.5 border-t border-border pt-5 sm:grid-cols-3">
          {benefits.map((benefit) => <span key={benefit} className="flex items-center gap-2 text-sm font-medium text-foreground/80"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />{benefit}</span>)}
        </div>
      </div>
    </section>
  );
}