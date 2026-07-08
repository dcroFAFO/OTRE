import React from "react";
import { LifeBuoy, Mail, Phone, MapPin } from "lucide-react";
import { CONTACT_DETAILS, CONTACT_LINKS } from "@/config/contactDetails";

// Reuses the single central contact-details config already used across
// the app — no hardcoded business details here.
export default function SupportCard() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-muted-foreground"><LifeBuoy className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="font-heading text-lg font-extrabold">Support / Contact</h2>
          <p className="text-xs text-muted-foreground">Need help? Get in touch with {CONTACT_DETAILS.businessName}.</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <a href={CONTACT_LINKS.phone} className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 hover:bg-secondary/40">
          <Phone className="h-4 w-4 text-muted-foreground shrink-0" /> {CONTACT_DETAILS.phone}
        </a>
        <a href={CONTACT_LINKS.email} className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 hover:bg-secondary/40">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" /> {CONTACT_DETAILS.email}
        </a>
        <a href={CONTACT_LINKS.maps} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 hover:bg-secondary/40">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" /> {CONTACT_DETAILS.address}
        </a>
      </div>
    </section>
  );
}