import React from "react";
import { Link } from "react-router-dom";
import { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

const ICONS = { Activity, CircleDot, Disc, BatteryCharging, Cpu, Wrench, Package, ShoppingBag };

export default function ServiceLandingSection({ service, index, bookingTarget, eyebrow }) {
  const Icon = ICONS[service.icon] || Wrench;
  const reversed = index % 2 === 1;

  return (
    <section id={index === 0 ? "services" : undefined} className="relative overflow-hidden py-12 sm:py-20">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <ScrollReveal className={reversed ? "lg:order-2" : undefined}>
          <div className="group mx-auto grid min-h-36 max-w-xl place-items-center rounded-3xl border border-border bg-gradient-to-br from-card to-accent/5 p-6 shadow-sm transition-all duration-300 hover:border-accent/40 hover:shadow-gentle sm:min-h-64 sm:p-8">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-accent-foreground sm:h-20 sm:w-20">
              <Icon className="h-9 w-9" aria-hidden="true" />
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.08} className={reversed ? "lg:order-1" : undefined}>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">{index === 0 ? eyebrow : service.category}</p>
          <h2 className="mt-2 font-heading text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:mt-3 sm:text-4xl">{service.name}</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
            {service.landingDescription || service.description}
          </p>
          <Link to={bookingTarget} className="mt-6 block sm:mt-7 sm:inline-flex">
            <Button size="lg" className="h-12 w-full gap-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 sm:h-10 sm:w-auto">
              Book this service <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}