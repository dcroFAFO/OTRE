import React from "react";
const CURRENT_YEAR = new Date().getFullYear();
import { Link } from "react-router-dom";
import { Zap, Mail, Phone, MapPin, Clock } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { CONTACT_DETAILS, CONTACT_LINKS } from "@/config/contactDetails";

export default function LandingFooter() {
  const { data: { business, app } } = usePlatformConfig();
  return (
    <footer className="bg-card/90 backdrop-blur-sm border-t border-border text-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-8 sm:py-14 lg:grid-cols-4 lg:gap-10">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-accent/15"><Zap className="h-5 w-5 text-accent" /></span>
            <span className="font-heading font-extrabold text-lg">{CONTACT_DETAILS.businessName}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm">{CONTACT_DETAILS.businessName} — {business.tagline}</p>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">Contact</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <a href={CONTACT_LINKS.email} className="flex min-h-11 items-center gap-2 rounded-lg transition-colors hover:text-accent"><Mail className="h-4 w-4" /> {CONTACT_DETAILS.email}</a>
            </li>
            <li>
              <a href={CONTACT_LINKS.phone} className="flex min-h-11 items-center gap-2 rounded-lg transition-colors hover:text-accent"><Phone className="h-4 w-4" /> {CONTACT_DETAILS.phone}</a>
            </li>
            <li>
              <a href={CONTACT_LINKS.maps} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-lg transition-colors hover:text-accent"><MapPin className="h-4 w-4" /> {CONTACT_DETAILS.address}</a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">Opening hours</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5" /> <span>Monday – Sunday, 11:00 AM – 7:30 PM</span></li>
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/portal" className="text-sm font-medium text-accent">{app.landing.portalLabel} →</Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">About us →</Link>
            <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">Contact →</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground/70">
        © {CURRENT_YEAR} {CONTACT_DETAILS.businessName}. Electric scooter repairs, servicing, diagnostics and maintenance.
      </div>
    </footer>
  );
}