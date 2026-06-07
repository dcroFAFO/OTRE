import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import JourneySection from "@/components/landing/JourneySection";
import BookingSection from "@/components/landing/BookingSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
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