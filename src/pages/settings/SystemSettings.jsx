import React from "react";
import BusinessProfileCard from "@/components/settings/BusinessProfileCard";
import DefaultPricingCard from "@/components/settings/DefaultPricingCard";
import SEO from "@/components/SEO";

export default function SystemSettings() {
  return (
    <>
    <SEO title="System Settings | On The Run Electrics" description="Manage private business configuration and default pricing." canonical="/settings" noindex />
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm">Configure authoritative business details, hours and default pricing.</p>
      </div>
      <BusinessProfileCard />
      <DefaultPricingCard />
    </div>
    </>
  );
}
