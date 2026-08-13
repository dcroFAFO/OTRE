import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";

/**
 * @param {{ label?: string, fullScreen?: boolean, className?: string }} props
 */
export default function PageLoader({ label = "Loading page", fullScreen = true, className }) {
  return (
    <div
      className={cn(
        "grid place-items-center bg-background px-5",
        fullScreen ? "min-h-screen" : "min-h-56 w-full",
        className,
      )}
    >
      <LoadingSpinner label={label} iconClassName="h-7 w-7 text-primary" />
    </div>
  );
}

