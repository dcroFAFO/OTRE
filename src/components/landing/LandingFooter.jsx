import React from "react";
const CURRENT_YEAR = new Date().getFullYear();
import { Link } from "react-router-dom";
import { Zap, Mail, Phone, MapPin } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

export default function LandingFooter() {
  const { data: { business, app } } = usePlatformConfig();
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-white/10"><Zap className="h-5 w-5 text-accent" /></span>
            <span className="font-heading font-extrabold text-lg">{business.name}</span>
          </div>
          <p className="mt-3 text-sm text-primary-foreground/70 max-w-sm">{business.legalName} — {business.tagline}</p>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">Contact</p>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {business.email}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {business.phone}</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {business.address}</li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">Opening hours</p>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            {business.openingHours.map((o) => (
              <li key={o.day} className="flex justify-between gap-4"><span>{o.day}</span><span>{o.hours}</span></li>
            ))}
          </ul>
          <Link to="/portal" className="mt-4 inline-block text-sm font-medium text-accent">{app.landing.portalLabel} →</Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-primary-foreground/50">
        © {CURRENT_YEAR} {business.legalName}. Powered by a modular job management platform.
      </div>
    </footer>
  );
}