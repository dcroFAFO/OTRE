import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import MobileLandingHero from "@/components/landing/MobileLandingHero";
import MobileServicesSection from "@/components/landing/MobileServicesSection";
import MobileProcessSection from "@/components/landing/MobileProcessSection";
import MobileIssuesSection from "@/components/landing/MobileIssuesSection";
import MobileTrustSection from "@/components/landing/MobileTrustSection";
import MobileContactCTA from "@/components/landing/MobileContactCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import RepairAssistantWidget from "@/components/landing/RepairAssistantWidget";
import SEO from "@/components/SEO";

export default function Landing() {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: "On The Run Electrics",
    description: "Electric scooter repairs, servicing and diagnostics in Woolloongabba, Brisbane.",
    url: typeof window !== "undefined" ? window.location.origin : "/",
    telephone: "+61415505908",
    email: "hello@ontherunelectrics.com.au",
    priceRange: "$$",
    areaServed: "Brisbane",
    address: { "@type": "PostalAddress", streetAddress: "11 Lucinda Street", addressLocality: "Woolloongabba", addressRegion: "QLD", postalCode: "4102", addressCountry: "AU" },
    openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "11:00", closes: "19:30" }],
    hasOfferCatalog: { "@type": "OfferCatalog", name: "Electric scooter services", itemListElement: ["Brake repairs", "Tyres and punctures", "Battery diagnostics", "Electrical fault finding", "General servicing", "Safety checks"].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })) },
  };

  return (
    <>
      <SEO title="Electric Scooter Repairs Brisbane | On The Run Electrics" description="Book electric scooter repairs, diagnostics and servicing in Woolloongabba, Brisbane. Clear repair updates and online job tracking." canonical="/" ogType="website" structuredData={localBusinessSchema} />
      <div className="min-h-screen overflow-hidden bg-background text-foreground">
        <LandingNav />
        <main>
          <MobileLandingHero />
          <MobileServicesSection />
          <MobileProcessSection />
          <MobileIssuesSection />
          <MobileTrustSection />
          <MobileContactCTA />
        </main>
        <LandingFooter />
        <RepairAssistantWidget />
      </div>
    </>
  );
}