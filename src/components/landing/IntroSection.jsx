import React from "react";
import ScrollReveal from "./ScrollReveal";

export default function IntroSection() {
  return (
    <section className="py-20 sm:py-28 bg-card/35 border-y border-border/70">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal className="max-w-3xl">
          <span className="text-sm font-semibold text-accent tracking-wide uppercase">Electric Scooter Repairs</span>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Electric Scooter Repairs That Keep You Moving
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed text-lg">
            On The Run Electrics provides practical repairs and servicing for electric scooters, from everyday maintenance to fault finding and electrical issues. Whether your scooter has lost power, needs new tyres, has braking problems, or simply needs a proper service, we help get it sorted without the runaround.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Booking online is quick, and once your repair is underway, you can track the progress of your job from start to finish.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}