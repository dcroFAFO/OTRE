import React from "react";
import { Link } from "react-router-dom";
import { Activity, BatteryCharging, CircleDot, Cpu, Disc, Wrench, ArrowRight } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

const ICONS = { Activity, BatteryCharging, CircleDot, Cpu, Disc, Wrench };

export default function MobileServicesSection() {
  const { data: { services, business } } = usePlatformConfig();
  return (
    <section id="services" className="border-y border-border bg-card/55 px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Repairs & servicing</p>
        <h2 className="mt-2 max-w-[18ch] text-3xl font-extrabold leading-tight">Everything your scooter needs, in one workshop.</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">Practical electric scooter repairs in Brisbane, from punctures and brakes to battery diagnostics, electrical faults and routine servicing.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = ICONS[service.icon] || Wrench;
            return (
              <Link key={service.name} to={business.primaryCta.target} className="group flex min-h-40 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-4 font-heading text-base font-bold">{service.name}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                <span className="mt-4 flex items-center gap-1.5 text-sm font-bold text-accent">Book this service <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}