import React, { useRef } from "react";
import LandingNav from "@/components/landing/LandingNav";
import MobileLandingHero from "@/components/landing/MobileLandingHero";
import MobileServicesSection from "@/components/landing/MobileServicesSection";
import MobileProcessSection from "@/components/landing/MobileProcessSection";
import MobileIssuesSection from "@/components/landing/MobileIssuesSection";
import MobileTrustSection from "@/components/landing/MobileTrustSection";
import MobileResourceSection from "@/components/landing/MobileResourceSection";
import MobileLocationSection from "@/components/landing/MobileLocationSection";
import MobileContactCTA from "@/components/landing/MobileContactCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import SEO from "@/components/SEO";
import { getLocalBusinessSchema } from "@/lib/structuredData";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

export default function Landing() {
  const heroRef = useRef(null);
  const { data: { business, services } } = usePlatformConfig();

  return (
    <>
      <SEO title={`Electric Scooter Repairs Brisbane | ${business.name}`} description={`Book electric scooter repairs, diagnostics and servicing at ${business.name} in ${business.locality}.`} canonical="/" ogType="website" structuredData={getLocalBusinessSchema(business, services)} />
      <div className="min-h-screen overflow-hidden bg-background text-foreground">
        <LandingNav heroRef={heroRef} />
        <main id="main-content">
          <div ref={heroRef}>
            <MobileLandingHero />
          </div>
          <MobileServicesSection />
          <MobileProcessSection />
          <MobileIssuesSection />
          <MobileTrustSection />
          <MobileResourceSection />
          <MobileLocationSection />
          <MobileContactCTA />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
