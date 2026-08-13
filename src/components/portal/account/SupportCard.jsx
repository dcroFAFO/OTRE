import React from "react";
import { LifeBuoy, Mail, Phone, MapPin } from "lucide-react";
import { businessContactLinks } from "@/config/platformConfig";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

// Reuses the single central contact-details config already used across
// the app — no hardcoded business details here.
export default function SupportCard() {
  const { data: { business } } = usePlatformConfig();
  const links = businessContactLinks(business);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-muted-foreground"><LifeBuoy className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="font-heading text-lg font-extrabold">Support / Contact</h2>
          <p className="text-xs text-muted-foreground">Need help? Get in touch with {business.name}.</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <a href={links.phone} className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-background px-4 py-2.5 hover:bg-secondary/40">
          <Phone className="h-4 w-4 text-muted-foreground shrink-0" /> {business.phone}
        </a>
        <a href={links.email} className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-background px-4 py-2.5 hover:bg-secondary/40">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" /> {business.email}
        </a>
        <a href={links.maps} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-background px-4 py-2.5 hover:bg-secondary/40">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" /> {business.address}
        </a>
      </div>
    </section>
  );
}
