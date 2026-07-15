import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_DETAILS, CONTACT_LINKS } from "@/config/contactDetails";

const CONTACTS = [
  [Phone, "Call", CONTACT_DETAILS.phone, CONTACT_LINKS.phone],
  [Mail, "Email", CONTACT_DETAILS.email, CONTACT_LINKS.email],
  [MapPin, "Workshop", CONTACT_DETAILS.address, CONTACT_LINKS.maps],
  [Clock, "Open", CONTACT_DETAILS.openingHours, null],
];

export default function MobileContactCTA() {
  return (
    <section id="contact" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-foreground p-6 text-background shadow-xl sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Ready to get moving?</p>
          <h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight">Send your repair request in a few minutes.</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-background/70">Tell us what is happening with your scooter. No payment is needed to request a booking.</p>
          <Link to="/book" className="mt-6 block sm:inline-flex"><Button size="lg" className="h-12 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto">Request a repair booking <ArrowRight aria-hidden="true" /></Button></Link>
        </div>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {CONTACTS.map(([Icon, label, value, href]) => {
            const content = <><Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" /><span><span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span><span className="mt-0.5 block text-sm font-semibold">{value}</span></span></>;
            return href ? <a key={label} href={href} className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-accent/40">{content}</a> : <div key={label} className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-4">{content}</div>;
          })}
        </div>
      </div>
    </section>
  );
}