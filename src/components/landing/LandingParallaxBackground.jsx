import React from "react";
import { LANDING_LOGO_URL } from "@/components/landing/LandingLogo";

export default function LandingParallaxBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background" aria-hidden="true">
      <div className="absolute inset-0 otr-grid-bg opacity-[0.08] sm:opacity-[0.11]" />
      <img
        src={LANDING_LOGO_URL}
        alt=""
        className="absolute -right-56 top-16 hidden w-[760px] opacity-[0.035] saturate-0 md:block lg:-right-36 lg:w-[900px]"
      />
    </div>
  );
}
