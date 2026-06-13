import React from "react";
import { CLIENT_STATUS_MAP, CLIENT_TAG_MAP } from "@/config/clientConfig";

const TONES = {
  slate: "bg-slate-100 text-slate-700",
  violet: "bg-violet-100 text-violet-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
  accent: "bg-accent/15 text-accent",
};

function Badge({ value, map }) {
  if (!value) return null;
  const item = map[value];
  const tone = TONES[item?.color] || TONES.slate;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone}`}>
      {item?.label || value}
    </span>
  );
}

export function ClientStatusBadge({ value }) {
  return <Badge value={value} map={CLIENT_STATUS_MAP} />;
}

export function ClientTagBadge({ value }) {
  return <Badge value={value} map={CLIENT_TAG_MAP} />;
}