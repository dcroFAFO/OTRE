import React from "react";
import NotificationPreferencesCard from "@/components/portal/settings/NotificationPreferencesCard";

export default function NotificationPreferences() {
  return <div className="mx-auto max-w-3xl space-y-5"><header><h1 className="font-heading text-2xl font-extrabold">My notification preferences</h1><p className="text-sm text-muted-foreground">Choose optional operational notifications within the boundaries set by administrators.</p></header><NotificationPreferencesCard /></div>;
}