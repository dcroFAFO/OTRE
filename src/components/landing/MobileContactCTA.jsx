import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessContactLinks, businessHoursSummary } from "@/config/platformConfig";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

export default function MobileContactCTA() {
  const { data: { business } } = usePlatformConfig();
  const links = businessContactLinks(business);
  /** @type {Array<[React.ElementType, string, string, string | null]>} */
  const contacts = [
    [Phone, "Call", business.phone, links.phone],
    [Mail, "Email", business.email, links.email],
    [MapPin, "Workshop", business.address, links.maps],
    [Clock, "Open", businessHoursSummary(business), null],
  ];
  return (
    <section id="contact" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-lg bg-foreground p-6 text-background shadow-xl sm:p-10">
          <p className="text-xs font-bold uppercase text-background/80">Ready to get moving?</p>
          <h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight">Send your repair request in a few minutes.</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-background/70">Tell us what is happening with your scooter. No payment is needed to request a booking. Workshop hours: {businessHoursSummary(business)}.</p>
          <Link to="/book" className="mt-6 block sm:inline-flex"><Button size="lg" className="h-12 w-full sm:w-auto">Request a repair booking <ArrowRight aria-hidden="true" /></Button></Link>
        </div>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {contacts.map(([Icon, label, value, href]) => {
            const content = <><Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span><span className="block text-xs font-bold uppercase text-muted-foreground">{label}</span><span className="mt-0.5 block text-sm font-semibold">{value}</span></span></>;
            return href ? <a key={label} href={href} className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40">{content}</a> : <div key={label} className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card p-4">{content}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
