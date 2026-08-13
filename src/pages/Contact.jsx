import React from "react";
import SEO from "@/components/SEO";
import LandingNav from "@/components/landing/LandingNav";
import LandingParallaxBackground from "@/components/landing/LandingParallaxBackground";
import LandingFooter from "@/components/landing/LandingFooter";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { businessContactLinks, businessHoursSummary } from "@/config/platformConfig";
import { getContactPageSchema } from "@/lib/structuredData";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import ErrorState from "@/components/shared/ErrorState";

export default function Contact() {
  const { data: { business }, isFetching, isError, error, refetch } = usePlatformConfig();
  const links = businessContactLinks(business);
  const hours = businessHoursSummary(business);
  return (
    <>
      <SEO
        title="Contact On The Run Electrics | Brisbane Repair Shop"
        description="Contact On The Run Electrics for electric scooter repairs in Brisbane. Call, email or visit our Woolloongabba workshop for service advice and bookings."
        canonical="/contact"
        structuredData={getContactPageSchema(business)}
      />
      <div className="min-h-screen bg-background text-foreground">
        <LandingParallaxBackground />
        <LandingNav />

        <main id="main-content" className="relative z-10 px-5 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-32">
          <div className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
              <Mail className="h-3.5 w-3.5" /> Contact
            </span>

            <h1 className="mt-5 font-heading text-4xl font-extrabold sm:text-5xl lg:text-6xl">
              Get in touch
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Have a question about a repair, want to get a quote, or just need some advice about your electric scooter?
              We'd love to hear from you. Reach out via any of the options below or drop in during opening hours.
            </p>
            {isFetching ? <p className="mt-3 text-xs text-muted-foreground" role="status">Refreshing contact details...</p> : null}
            {isError ? <ErrorState className="mt-5" error={error} title="Current business details could not be refreshed" description="The fallback contact details are shown below. You can retry the refresh." onRetry={refetch} /> : null}

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <a href={links.email} className="group flex items-start gap-4 rounded-lg border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-primary">Email us</p>
                  <p className="mt-1 font-heading text-lg font-extrabold break-all">{business.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">We typically respond within a few hours.</p>
                </div>
              </a>

              <a href={links.phone} className="group flex items-start gap-4 rounded-lg border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-primary">Call us</p>
                  <p className="mt-1 font-heading text-lg font-extrabold">{business.phone}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Available during workshop hours.</p>
                </div>
              </a>

              <a href={links.maps} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-4 rounded-lg border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-primary">Visit us</p>
                  <p className="mt-1 font-heading text-lg font-extrabold">{business.address}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Walk-ins welcome. Get directions →</p>
                </div>
              </a>

              <div className="flex items-start gap-4 rounded-lg border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-primary">Opening hours</p>
                  <p className="mt-1 font-heading text-lg font-extrabold">Workshop hours</p>
                  <p className="mt-1 text-sm text-muted-foreground">{hours}</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
