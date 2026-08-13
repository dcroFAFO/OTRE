import React from "react";
import { cn } from "@/lib/utils";

export const LANDING_LOGO_URL = "/brand-logo.png";

/** @param {{ className?: string, imageClassName?: string }} props */
export default function LandingLogo({ className, imageClassName }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src={LANDING_LOGO_URL}
        alt="On The Run Electrics"
        decoding="async"
        className={cn("block h-auto w-auto object-contain", imageClassName)}
      />
      <span className="sr-only">On The Run Electrics</span>
    </span>
  );
}
