import React from "react";
import BusinessHoursCard from "@/components/settings/BusinessHoursCard";
import NotificationPrefsCard from "@/components/settings/NotificationPrefsCard";
import DefaultPricingCard from "@/components/settings/DefaultPricingCard";

export default function SystemSettings() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm">Configure business hours, notifications and default pricing.</p>
      </div>
      <BusinessHoursCard />
      <NotificationPrefsCard />
      <DefaultPricingCard />
    </div>
  );
}