import React from "react";
import { cn } from "@/lib/utils";

const LOGO_URL = "https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/264d46b8d_image142071.jpg";

export default function BrandLogo({ className, imageClassName }) {
  return (
    <span className={cn("inline-flex overflow-hidden rounded-2xl border border-border bg-card shadow-sm", className)}>
      <img
        src={LOGO_URL}
        alt="On The Run logo"
        className={cn("h-full w-full object-cover", imageClassName)}
      />
    </span>
  );
}