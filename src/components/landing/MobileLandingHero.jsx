import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { CONTACT_DETAILS, CONTACT_LINKS } from "@/config/contactDetails";
import HeroCarousel from "@/components/landing/HeroCarousel";

export default function MobileLandingHero() {
  const { data: { business } } = usePlatformConfig();
  const benefits = ["No payment to request", "Clear repair updates", "Track your repair online"];

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-24 sm:px-8 sm:pb-20 sm:pt-32">
      <div className="relative mx-auto max-w-5xl">
        <HeroCarousel>
          <div className="mt-7 grid gap-3 sm:flex">
            <Link to={business.primaryCta.target} className="w-full sm:w-auto">
              <Button size="lg" className="h-12 w-full rounded-xl bg-accent px-6 text-base text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90 sm:w-auto">
                Request a repair booking <ArrowRight aria-hidden="true" />
              </Button>
            </Link>
            <a href={CONTACT_LINKS.phone} className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-12 w-full rounded-xl border-white/30 bg-white/10 px-6 text-base text-white backdrop-blur hover:bg-white/20 hover:text-white sm:w-auto">
                <Phone aria-hidden="true" /> Call {CONTACT_DETAILS.phone}
              </Button>
            </a>
          </div>
        </HeroCarousel>

        <div className="mt-7 grid gap-2.5 border-t border-border pt-5 sm:grid-cols-3">
          {benefits.map((benefit) => <span key={benefit} className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />{benefit}</span>)}
        </div>
      </div>
    </section>
  );
}