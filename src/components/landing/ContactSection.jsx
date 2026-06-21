import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_DETAILS, CONTACT_LINKS } from "@/config/contactDetails";
import ScrollReveal from "./ScrollReveal";

const ITEMS = [
  { icon: Mail, label: "Email", value: CONTACT_DETAILS.email, href: CONTACT_LINKS.email },
  { icon: Phone, label: "Phone", value: CONTACT_DETAILS.phone, href: CONTACT_LINKS.phone },
  { icon: MapPin, label: "Address", value: CONTACT_DETAILS.address, href: CONTACT_LINKS.maps, external: true },
  { icon: Clock, label: "Opening Hours", value: CONTACT_DETAILS.openingHours },
];

export default function ContactSection() {
  return (
    <section id="contact" className="py-20 sm:py-28 bg-card/35 border-y border-border/70">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <ScrollReveal>
            <span className="text-sm font-semibold text-accent tracking-wide uppercase">Contact</span>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Get In Touch
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed text-lg">
              Have a question about your scooter, repair options, or an existing job? Contact On The Run Electrics or book your repair online.
            </p>
            <Link to="/book" className="mt-8 inline-flex">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl gap-2 shadow-lg shadow-accent/20">
                Book a Repair <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </ScrollReveal>

          <ScrollReveal className="grid gap-4 sm:grid-cols-2">
            {ITEMS.map(({ icon: Icon, label, value, href, external }) => {
              const content = (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{value}</span>
                  </span>
                </>
              );

              if (!href) {
                return <div key={label} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">{content}</div>;
              }

              return (
                <a
                  key={label}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-accent/50 hover:bg-accent/5"
                >
                  {content}
                </a>
              );
            })}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}