import { useId } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * @param {{ title: string, description?: string, icon?: React.ElementType, action?: React.ReactNode, className?: string, compact?: boolean }} props
 */
export default function EmptyState({ title, description, icon: Icon = Inbox, action, className, compact = false }) {
  const titleId = useId();
  return (
    <section className={cn("grid place-items-center px-5 text-center", compact ? "py-8" : "py-14", className)} aria-labelledby={titleId}>
      <div className="grid h-11 w-11 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 id={titleId} className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
