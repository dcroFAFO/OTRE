import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSafeErrorMessage } from "@/lib/errors";

/**
 * @param {{ title?: string, description?: string, error?: unknown, onRetry?: (() => void) | (() => Promise<unknown>), retryLabel?: string, className?: string }} props
 */
export default function ErrorState({
  title = "We could not load this information",
  description,
  error,
  onRetry,
  retryLabel = "Try again",
  className,
}) {
  const safeDescription = description || (error
    ? getSafeErrorMessage(error)
    : "Please try again. If the problem continues, come back in a few minutes.");

  return (
    <Alert variant="destructive" className={cn("rounded-lg", className)}>
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{safeDescription}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" className="mt-3 text-foreground" onClick={() => void onRetry()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
