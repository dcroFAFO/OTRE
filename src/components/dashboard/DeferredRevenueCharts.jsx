import React, { Suspense, useEffect, useState } from "react";

const RevenueChartsSection = React.lazy(() => import("@/components/dashboard/RevenueChartsSection"));

function ChartsPlaceholder() {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
      Loading financial charts…
    </div>
  );
}

export default function DeferredRevenueCharts() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => window.cancelIdleCallback?.(id);
    }

    const id = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready) return <ChartsPlaceholder />;

  return (
    <Suspense fallback={<ChartsPlaceholder />}>
      <RevenueChartsSection />
    </Suspense>
  );
}