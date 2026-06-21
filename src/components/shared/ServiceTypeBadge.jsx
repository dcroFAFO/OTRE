import React from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_SERVICE_TYPE, getServiceType, SERVICE_TYPE_BADGE_CLASSES } from "@/config/serviceTypes";

export default function ServiceTypeBadge({ job, value, className }) {
  const key = value || job?.service_type || DEFAULT_SERVICE_TYPE;
  const serviceType = getServiceType(key);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        SERVICE_TYPE_BADGE_CLASSES[serviceType.key] || SERVICE_TYPE_BADGE_CLASSES[DEFAULT_SERVICE_TYPE],
        className
      )}
    >
      {serviceType.label}
    </span>
  );
}