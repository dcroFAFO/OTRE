import React from "react";
import PhoneNumberField from "@/components/booking/PhoneNumberField";

export default function ReviewStep({ data, update, user, profile, scooterLabel }) {
  const name = profile?.display_name || profile?.full_name || user?.full_name || "";
  const service = data.service === "Other" ? data.customIssue.trim() : data.service;
  const rows = [
    ["Name", name],
    ["Scooter", scooterLabel],
    ["Service requested", service],
    ["Additional notes", data.notes.trim() || "—"],
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Please review your booking request before submitting.</p>
      <div className="divide-y divide-border rounded-xl border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 px-4 py-2.5 text-sm">
            <span className="w-36 shrink-0 font-medium text-muted-foreground">{label}</span>
            <span className="text-foreground">{value}</span>
          </div>
        ))}
      </div>
      {!profile?.phone_e164 && (
        <PhoneNumberField label="Mobile (so we can contact you)" required value={data.phone} onChange={(e) => update({ phone: e.target.value })} />
      )}
      <p className="text-xs text-muted-foreground">Your account details ({user?.email}) are linked to this booking automatically.</p>
    </div>
  );
}