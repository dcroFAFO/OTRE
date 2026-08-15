import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HistoryPagingState({ history, error, loading, onLoadMore, onRetry }) {
  const hasMore = history?.pagination?.has_more === true;
  const partialSources = Object.entries(history?.truncation || {})
    .filter(([key, value]) => key !== "jobs" && value)
    .map(([key]) => key);
  const queryFailures = history?.query_failures || [];
  const hasPartialSources = partialSources.length > 0 || queryFailures.length > 0;
  if (!error && !hasMore && !hasPartialSources) return null;

  const sourceNames = [...new Set([...partialSources, ...queryFailures])].join(", ");
  return (
    <div className="mt-4 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
      {error ? <p>The next history page could not be loaded. Records already shown remain available.</p> : null}
      {!error && hasMore ? <p>Showing {history?.linked?.jobs?.length || 0} loaded jobs. Older history is available.</p> : null}
      {!error && !hasMore && hasPartialSources ? (
        <p>
          Some related {sourceNames || "history"} records could not be fully loaded. Treat the totals above as partial; no additional job-history page is available.
        </p>
      ) : null}
      {error || hasMore ? (
        <Button type="button" variant="outline" size="touch" disabled={loading} aria-busy={loading} onClick={error ? onRetry : onLoadMore}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Loading history" : error ? "Retry history" : "Load older history"}
        </Button>
      ) : null}
    </div>
  );
}
