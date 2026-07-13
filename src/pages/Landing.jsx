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
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingParallaxBackground from "@/components/landing/LandingParallaxBackground";
import RepairAssistantWidget from "@/components/landing/RepairAssistantWidget";
import SEO from "@/components/SEO";

export default function Landing() {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "On The Run Electrics",
    description: "Electric scooter repairs, servicing, diagnostics and maintenance in Brisbane.",
    url: typeof window !== "undefined" ? window.location.origin : "/",
    serviceType: "Electric scooter repair",
  };

  return (
    <>
      <SEO
        title="Electric Scooter Repairs Brisbane | On The Run Electrics"
        description="Book electric scooter repairs in Brisbane with On The Run Electrics. Get expert diagnostics, servicing, tyre repairs and transparent job tracking."
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
          <PricingSection />
          <CommonIssuesSection />
          <ServicingSection />
          <WhyChooseSection />
          <TestimonialsSection />
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