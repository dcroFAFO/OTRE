import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import JourneySection from "@/components/landing/JourneySection";
import IntroSection from "@/components/landing/IntroSection";
import CommonIssuesSection from "@/components/landing/CommonIssuesSection";
import ServicingSection from "@/components/landing/ServicingSection";
import WhyChooseSection from "@/components/landing/WhyChooseSection";
import ContactSection from "@/components/landing/ContactSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingParallaxBackground from "@/components/landing/LandingParallaxBackground";
import RepairAssistantWidget from "@/components/landing/RepairAssistantWidget";
import SEO from "@/components/SEO";

export default function Landing() {
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://ontherunelectrics.com.au";
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "On The Run Electrics",
    description: "Brisbane electric scooter repair specialists offering diagnostics, servicing and maintenance.",
    url: siteUrl,
    areaServed: { "@type": "City", name: "Brisbane" },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Brisbane",
      addressRegion: "QLD",
      addressCountry: "AU",
    },
    makesOffer: {
      "@type": "Offer",
      url: `${siteUrl}/book`,
      itemOffered: {
        "@type": "Service",
        name: "Electric Scooter Repair",
        serviceType: "Electric Scooter Repair",
        areaServed: "Brisbane",
      },
    },
  };

  return (
    <>
      <SEO
        title="Electric Scooter Repairs Brisbane | On The Run Electrics"
        description="Brisbane's trusted electric scooter repair specialists. Fast turnaround, expert technicians, easy online booking. Book your repair today at On The Run Electrics."
        canonical="/"
        ogType="website"
        structuredData={localBusinessSchema}
      />
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <LandingParallaxBackground />
      <div className="relative z-10">
        <LandingNav />
        <main>
          <HeroSection />
          <IntroSection />
          <ServicesSection />
          <CommonIssuesSection />
          <ServicingSection />
          <WhyChooseSection />
          <JourneySection />
          <ContactSection />
          <FinalCTASection />
        </main>
        <LandingFooter />
        <RepairAssistantWidget />
      </div>
    </div>
    </>
  );
}