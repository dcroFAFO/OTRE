import React from "react";
import { DEFAULT_JOB_TYPES, DEFAULT_SERVICE_CATEGORIES } from "@/config/platformConfig";
import { cn } from "@/lib/utils";

const SERVICE_TYPE_CLASSES = {
  diagnostics: "bg-violet-100 text-violet-800 border-violet-200",
  diagnostic: "bg-violet-100 text-violet-800 border-violet-200",
  repairs: "bg-blue-100 text-blue-800 border-blue-200",
  repair: "bg-blue-100 text-blue-800 border-blue-200",
  power: "bg-amber-100 text-amber-800 border-amber-200",
  maintenance: "bg-emerald-100 text-emerald-800 border-emerald-200",
  service: "bg-emerald-100 text-emerald-800 border-emerald-200",
  parts: "bg-orange-100 text-orange-800 border-orange-200",
  sales: "bg-pink-100 text-pink-800 border-pink-200",
  default: "bg-slate-100 text-slate-700 border-slate-200",
};

function humanize(value) {
  if (!value) return "Service";
  return String(value)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ServiceTypeBadge({ job, className }) {
  const key = job?.service_category_key || job?.job_type || "service";
  const category = DEFAULT_SERVICE_CATEGORIES.find((item) => item.key === key);
  const type = DEFAULT_JOB_TYPES.find((item) => item.key === key);
  const label = category?.name || type?.label || humanize(key);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        SERVICE_TYPE_CLASSES[key] || SERVICE_TYPE_CLASSES.default,
        className
      )}
    >
      {label}
    </span>
  );
}