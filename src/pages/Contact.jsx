import React from "react";
import SEO from "@/components/SEO";
import LandingNav from "@/components/landing/LandingNav";
import LandingParallaxBackground from "@/components/landing/LandingParallaxBackground";
import LandingFooter from "@/components/landing/LandingFooter";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { CONTACT_DETAILS, CONTACT_LINKS } from "@/config/contactDetails";

export default function Contact() {
  return (
    <>
      <SEO
        title="Contact OTR Scooters | Brisbane Repair Shop"
        description="Contact OTR Scooters for electric scooter repairs in Brisbane. Call, email or visit our Wooloongabba workshop for service advice and bookings."
        canonical="/contact"
      />
      <main className="min-h-screen bg-background text-foreground">
        <LandingParallaxBackground />
        <LandingNav />

        <section className="relative z-10 px-5 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-32">
          <div className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-accent">
              <Mail className="h-3.5 w-3.5" /> Contact
            </span>

            <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Get in touch
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Have a question about a repair, want to get a quote, or just need some advice about your electric scooter?
              We'd love to hear from you. Reach out via any of the options below or drop in during opening hours.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <a href={CONTACT_LINKS.email} className="group flex items-start gap-4 rounded-3xl border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl transition-colors hover:border-accent/40 hover:bg-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Email us</p>
                  <p className="mt-1 font-heading text-lg font-extrabold break-all">{CONTACT_DETAILS.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">We typically respond within a few hours.</p>
                </div>
              </a>

              <a href={CONTACT_LINKS.phone} className="group flex items-start gap-4 rounded-3xl border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl transition-colors hover:border-accent/40 hover:bg-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Call us</p>
                  <p className="mt-1 font-heading text-lg font-extrabold">{CONTACT_DETAILS.phone}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Available during workshop hours.</p>
                </div>
              </a>

              <a href={CONTACT_LINKS.maps} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-4 rounded-3xl border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl transition-colors hover:border-accent/40 hover:bg-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Visit us</p>
                  <p className="mt-1 font-heading text-lg font-extrabold">{CONTACT_DETAILS.address}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Walk-ins welcome. Get directions →</p>
                </div>
              </a>

              <div className="flex items-start gap-4 rounded-3xl border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Opening hours</p>
                  <p className="mt-1 font-heading text-lg font-extrabold">Mon – Sun</p>
                  <p className="mt-1 text-sm text-muted-foreground">11:00 AM – 7:30 PM</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <LandingFooter />
      </main>
    </>
  );
}