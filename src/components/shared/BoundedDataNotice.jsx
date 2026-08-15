import React from "react";
import { Button } from "@/components/ui/button";

/**
 * Makes client-side calculations honest while more server records remain.
 *
 * @param {{
 *   noun: string,
 *   loadedCount: number,
 *   hasMore?: boolean,
 *   isLoadingMore?: boolean,
 *   onLoadMore?: () => void,
 *   description?: string,
 * }} props
 */
export default function BoundedDataNotice({
  noun,
  loadedCount,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  description,
}) {
  if (!hasMore) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
      <p>
        {description || `Showing ${loadedCount} loaded ${noun}. Counts, filters, and totals do not include records that have not been loaded.`}
      </p>
      {onLoadMore ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
          disabled={isLoadingMore}
          onClick={onLoadMore}
        >
          {isLoadingMore ? `Loading ${noun}…` : `Load more ${noun}`}
        </Button>
      ) : null}
    </div>
  );
}
