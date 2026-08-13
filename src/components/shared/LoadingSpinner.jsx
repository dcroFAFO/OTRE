import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * @param {{ label?: string, className?: string, iconClassName?: string, decorative?: boolean }} props
 */
export default function LoadingSpinner({ label = "Loading", className, iconClassName, decorative = false }) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-2", className)} role={decorative ? undefined : "status"} aria-live={decorative ? undefined : "polite"} aria-hidden={decorative || undefined}>
      <LoaderCircle className={cn("h-5 w-5 animate-spin", iconClassName)} aria-hidden="true" />
      {!decorative && <span className={label ? "text-sm text-muted-foreground" : "sr-only"}>{label || "Loading"}</span>}
    </span>
  );
}
