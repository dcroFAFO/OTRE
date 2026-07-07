import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingConfirmation({ result, summary, onManage, onBack }) {
  return (
    <div className="py-4 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent"><CheckCircle2 className="h-8 w-8" /></span>
      <h3 className="mt-4 font-heading text-xl font-extrabold">Booking request received</h3>
      <p className="mt-1 text-sm text-muted-foreground">Our team will contact you to confirm drop-off details.</p>
      <div className="mx-auto mt-5 max-w-sm divide-y divide-border rounded-xl border border-border text-left text-sm">
        <Row label="Reference" value={result?.reference || "—"} />
        <Row label="Scooter" value={summary?.scooterLabel || "—"} />
        <Row label="Service requested" value={summary?.service || "—"} />
      </div>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={onManage} className="bg-accent text-accent-foreground hover:bg-accent/90">Manage This Job</Button>
        <Button variant="outline" onClick={onBack}>Back to jobs</Button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3 px-4 py-2.5">
      <span className="w-32 shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}