import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import JourneySection from "@/components/landing/JourneySection";
import BookingSection from "@/components/landing/BookingSection";
import LandingFooter from "@/components/landing/LandingFooter";
import { useCustomerPortalRedirect } from "@/components/landing/useCustomerPortalRedirect";

export default function Landing() {
  useCustomerPortalRedirect();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <HeroSection />
        <ServicesSection />
        <JourneySection />
        <BookingSection />
      </main>
      <LandingFooter />
    </div>
  );
}