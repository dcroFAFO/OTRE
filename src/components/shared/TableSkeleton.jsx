import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * @param {{ rows?: number, columns?: number, className?: string, label?: string }} props
 */
export default function TableSkeleton({ rows = 6, columns = 4, className, label = "Loading table" }) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div className="grid gap-4 border-b border-border bg-muted/50 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, index) => <Skeleton key={index} className="h-4 w-20 max-w-full" />)}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="grid gap-4 border-b border-border p-4 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, column) => <Skeleton key={column} className="h-4 w-full max-w-32" />)}
        </div>
      ))}
    </div>
  );
}
