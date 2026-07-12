import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

export default function NewsPageShell({ children, width = "max-w-7xl" }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main className={`mx-auto ${width} px-4 pb-16 pt-24 sm:px-6 lg:px-8`}>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}