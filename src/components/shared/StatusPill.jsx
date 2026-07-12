import React from "react";
import { STATUS_PILL_CLASSES, getStatus, getPaymentStatus, getQuoteStatus } from "@/config/jobConfig";
import { cn } from "@/lib/utils";

const resolvers = { job: getStatus, payment: getPaymentStatus, quote: getQuoteStatus };

export default function StatusPill({ value, kind = "job", className = undefined, label = undefined }) {
  const status = resolvers[kind](value);
  const classes = STATUS_PILL_CLASSES[status.color] || STATUS_PILL_CLASSES.slate;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        classes,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label || status.label}
    </span>
  );
}
