import { SearchX } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

/**
 * @param {{ title?: string, description?: string, onClear?: () => void, clearLabel?: string, className?: string }} props
 */
export default function NoResultsState({
  title = "No matching results",
  description = "Try changing or clearing the active search and filters.",
  onClear,
  clearLabel = "Clear filters",
  className,
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={SearchX}
      className={className}
      action={onClear ? <Button type="button" variant="outline" onClick={onClear}>{clearLabel}</Button> : null}
    />
  );
}

