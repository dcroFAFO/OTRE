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
import { localBusinessSchema } from "@/lib/structuredData";

export default function Landing() {
  const heroRef = useRef(null);

  return (
    <>
      <SEO title="Electric Scooter Repairs Brisbane | On The Run Electrics" description="Book electric scooter repairs, diagnostics and servicing in Woolloongabba, Brisbane. Clear repair updates and online job tracking." canonical="/" ogType="website" structuredData={localBusinessSchema} />
      <div className="min-h-screen overflow-hidden bg-background text-foreground">
        <LandingNav heroRef={heroRef} />
        <main>
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