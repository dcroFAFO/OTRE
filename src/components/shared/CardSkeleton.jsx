import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * @param {{ count?: number, className?: string, compact?: boolean, label?: string }} props
 */
export default function CardSkeleton({ count = 1, className, compact = false, label = "Loading content" }) {
  return (
    <div
      className={cn("grid gap-4", count > 1 && "sm:grid-cols-2 xl:grid-cols-4", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <Skeleton className="h-4 w-28" />
          <Skeleton className={cn("mt-4 w-20", compact ? "h-6" : "h-9")} />
          <Skeleton className="mt-3 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
