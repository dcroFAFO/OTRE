import React from "react";
import SEO from "@/components/SEO";
import LandingNav from "@/components/landing/LandingNav";
import LandingParallaxBackground from "@/components/landing/LandingParallaxBackground";
import LandingFooter from "@/components/landing/LandingFooter";
import { Zap, Wrench, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <>
      <SEO
        title="About Us | On The Run Electrics"
        description="Learn about On The Run Electrics — Brisbane's trusted electric scooter repair shop. Expert technicians, transparent pricing, and fast turnaround."
        canonical="/about"
      />
      <main className="min-h-screen bg-background text-foreground">
        <LandingParallaxBackground />
        <LandingNav />

        <section className="relative z-10 px-5 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-32">
          <div className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-accent">
              <Zap className="h-3.5 w-3.5" /> About us
            </span>

            <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Brisbane's home for electric scooter repairs
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              On The Run Electrics is Brisbane's dedicated electric scooter repair and servicing workshop,
              located in Wooloongabba. We specialise in all makes and models of electric scooters, from
              everyday commuters to performance machines. Whether your scooter has a flat tyre, a failing
              battery, electrical gremlins, or just needs a routine tune-up, our skilled technicians have
              you covered.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Wrench, title: "Expert Repairs", body: "Our technicians are trained on all major brands. From controller faults and wiring issues to brake overhauls and battery replacements, we handle it all efficiently and honestly." },
                { icon: Star, title: "Transparent Pricing", body: "You'll always know the cost before we begin work. We provide detailed digital quotes and never surprise you with hidden fees. Most jobs are completed same-day or next-day." },
                { icon: Users, title: "Built for Riders", body: "We built this platform to give riders full visibility of their repair — live status updates, an online customer portal, invoice management, and a loyalty program for our most frequent customers." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-3xl border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 font-heading text-lg font-extrabold">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-3xl border border-border bg-card/85 p-8 shadow-gentle backdrop-blur-xl sm:p-10">
              <h2 className="font-heading text-2xl font-extrabold">Our story</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                On The Run Electrics was founded by riders, for riders. As electric scooters became
                increasingly popular across Brisbane, we noticed a gap in the market — there were very
                few places with the expertise, equipment, and genuine care needed to service them
                properly. So we opened our workshop in Wooloongabba, seven days a week, to fill that gap.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Today we service hundreds of riders every month, from daily commuters and delivery
                workers to enthusiasts who ride for sport. We stock parts for the most popular brands
                and can source specialty components quickly. Our customer portal — the platform you're
                using right now — was built in-house to make the repair process as transparent and
                hassle-free as possible for every customer.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                We're passionate about electric mobility and the role it plays in reducing congestion
                and emissions in our city. Every scooter we repair is one more electric ride on the road.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild className="h-11 rounded-xl bg-accent px-6 text-accent-foreground hover:bg-accent/90">
                <Link to="/book">Book a repair</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl px-6">
                <Link to="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </section>

        <LandingFooter />
      </main>
    </>
  );
}