import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Phone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { CONTACT_DETAILS, CONTACT_LINKS } from "@/config/contactDetails";

export default function MobileLandingHero() {
  const { data: { business } } = usePlatformConfig();
  const benefits = ["No payment to request", "Clear repair updates", "Track your repair online"];

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-24 sm:px-8 sm:pb-20 sm:pt-32">
      <div className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Electric scooter repairs · Woolloongabba
        </div>
        <h1 className="mt-5 max-w-[14ch] font-heading text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
          Service that fits your life, not your lunch break.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Open until midnight, every night — so busy schedules never get in the way of a repair. Can't make our hours? Get in touch and we'll arrange a time that works for you.
        </p>
        <div className="mt-7 grid gap-3 sm:flex">
          <Link to={business.primaryCta.target}>
            <Button size="lg" className="h-12 w-full rounded-xl bg-accent px-6 text-base text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90 sm:w-auto">
              Request a repair booking <ArrowRight aria-hidden="true" />
            </Button>
          </Link>
          <a href={CONTACT_LINKS.phone}>
            <Button size="lg" variant="outline" className="h-12 w-full rounded-xl px-6 text-base sm:w-auto">
              <Phone aria-hidden="true" /> Call {CONTACT_DETAILS.phone}
            </Button>
          </a>
        </div>
        <div className="mt-7 grid gap-2.5 border-t border-border pt-5 sm:grid-cols-3">
          {benefits.map((benefit) => <span key={benefit} className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />{benefit}</span>)}
        </div>
      </div>
    </section>
  );
}