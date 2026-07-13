import React from "react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import ServiceLandingSection from "./ServiceLandingSection";

export default function ServicesSection() {
  const { data: { services, business, app } } = usePlatformConfig();

  return (
    <div>
      {services.map((service, index) => (
        <ServiceLandingSection
          key={service.name}
          service={service}
          index={index}
          bookingTarget={business.primaryCta.target}
          eyebrow={app.landing.servicesEyebrow}
        />
      ))}
    </div>
  );
}