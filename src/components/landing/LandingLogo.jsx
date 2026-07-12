import React from "react";
import { cn } from "@/lib/utils";

export const LANDING_LOGO_URL = "https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/64421c54c_image.png";

export default function LandingLogo({ className = undefined, imageClassName = undefined }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src={LANDING_LOGO_URL}
        alt="On The Road logo"
        className={cn("block h-auto w-auto object-contain", imageClassName)}
      />
      <span className="sr-only">On The Road</span>
    </span>
  );
}
