import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import JourneySection from "@/components/landing/JourneySection";
import LandingFooter from "@/components/landing/LandingFooter";
import { useCustomerPortalRedirect } from "@/components/landing/useCustomerPortalRedirect";
import SEO from "@/components/SEO";

export default function Landing() {
  useCustomerPortalRedirect();
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "OTR Scooters",
    description: "Electric scooter repairs, diagnostics, servicing, parts and sales with online booking and job tracking.",
    url: typeof window !== "undefined" ? window.location.origin : "/",
    serviceType: "Electric scooter repair",
  };

  return (
    <>
      <SEO
        title="Electric Scooter Repairs | OTR Scooters"
        description="Book expert electric scooter repairs, diagnostics, servicing and parts with transparent quotes, online approvals and real-time job tracking."
        canonical="/"
        ogType="website"
        structuredData={localBusinessSchema}
      />
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <HeroSection />
        <ServicesSection />
        <JourneySection />
      </main>
      <LandingFooter />
    </div>
    </>
  );
}