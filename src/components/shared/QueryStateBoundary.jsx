import React from "react";
import { Loader2, AlertTriangle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeError } from "@/lib/errors";

// Standard wrapper for react-query driven lists/panels.
// - loading  → spinner (never an indefinite blank)
// - error    → friendly message + Retry (no scary text, clear next step)
// - empty    → calm empty state (distinct from an error)
// - success  → renders children
export default function QueryStateBoundary({
  query,
  isEmpty,
  loadingLabel = "Loading…",
  emptyTitle = "Nothing here yet",
  emptyHint,
  emptyIcon: EmptyIcon = Inbox,
  children,
}) {
  const { isLoading, isError, error, refetch, isFetching } = query;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <p className="text-sm">{loadingLabel}</p>
      </div>
    );
  }

  if (isError) {
    const { message, retryable } = normalizeError(error);
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 py-12 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-rose-800">{message}</p>
        {retryable !== false && (
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="mt-4 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
        <EmptyIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        {emptyHint && <p className="text-xs text-muted-foreground mt-1">{emptyHint}</p>}
      </div>
    );
  }

  return children;
}