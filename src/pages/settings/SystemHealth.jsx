import React from "react";
import SEO from "@/components/SEO";
import { getErrorHistory } from "@/lib/logger";
import { getClientReportingStatus } from "@/lib/reportClientError";

function StatusCard({ label, value, detail }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </section>
  );
}

export default function SystemHealth() {
  const reporting = getClientReportingStatus();
  const recentErrors = getErrorHistory();
  return (
    <>
      <SEO title="System Health | On The Run Electrics" description="Private release and client diagnostics status." canonical="/settings/system-health" noindex />
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">System health</h1>
          <p className="text-sm text-muted-foreground">Release identity and privacy-safe diagnostics for this browser.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatusCard label="Release" value={reporting.release} detail="Set by VITE_RELEASE_ID during the build." />
          <StatusCard label="Remote client reporting" value={reporting.enabled ? "Enabled" : "Not configured"} detail="Only minimal same-origin events are permitted." />
          <StatusCard label="Local recent errors" value={String(recentErrors.length)} detail="Stored in this browser only; history is capped at 50." />
        </div>
      </div>
    </>
  );
}

