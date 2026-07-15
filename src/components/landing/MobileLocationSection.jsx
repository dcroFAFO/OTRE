import React from "react";
import { MapPin, ParkingCircle, DoorOpen } from "lucide-react";
import { CONTACT_DETAILS, CONTACT_LINKS } from "@/config/contactDetails";

const DETAILS = [
  [ParkingCircle, "Parking", "Free on-street parking is available right along Lucinda Street — just pull up close to the workshop."],
  [DoorOpen, "Entrance", "Look for the On The Run Electrics signage out front and roll your scooter straight in through the workshop's street-facing door."],
];

export default function MobileLocationSection() {
  return (
    <section className="border-y border-border bg-card/55 px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Find us</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight">Getting to the workshop</h2>
        <a href={CONTACT_LINKS.maps} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground hover:text-accent">
          <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> {CONTACT_DETAILS.address}
        </a>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {DETAILS.map(([Icon, title, text]) => (
            <article key={title} className="rounded-2xl border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}