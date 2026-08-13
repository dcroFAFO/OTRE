import React, { useEffect, useState } from "react";
import RevenueChartsSection from "@/components/dashboard/RevenueChartsSection";
import { CardSkeleton } from "@/components/shared";

function ChartsPlaceholder() {
  return <CardSkeleton count={3} compact />;
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

  return <RevenueChartsSection />;
}
