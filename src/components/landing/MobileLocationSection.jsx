import React, { useState, useEffect } from "react";
import { MapPin, Navigation, ParkingCircle, Building2 } from "lucide-react";
import { CONTACT_DETAILS } from "@/config/contactDetails";
import { base44 } from "@/api/base44Client";

const LOCATION_NOTES = [
  { icon: Building2, text: "Look for the James Trowse building — we're right next to Woolloongabba Rotary Park." },
  { icon: Navigation, text: "We're next door to a mechanics workshop, so keep an eye out for that as your marker." },
  { icon: ParkingCircle, text: "No dedicated car park — street parking is available right outside." },
];

export default function MobileLocationSection() {
  const [embedUrl, setEmbedUrl] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getMapEmbedUrl", { address: CONTACT_DETAILS.address })
      .then((res) => setEmbedUrl(res.data?.embedUrl || null))
      .catch(() => setEmbedUrl(null));
  }, []);

  return (
    <section className="px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl rounded-3xl border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Finding us
        </div>
        <h2 className="mt-4 font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">A little tricky to spot? Here's how to find us.</h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{CONTACT_DETAILS.address}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {LOCATION_NOTES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <p className="text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-border">
          {embedUrl ? (
            <iframe
              title="Workshop location map"
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-background/60 text-sm text-muted-foreground">
              Loading map…
            </div>
          )}
        </div>
      </div>
    </section>
  );
}