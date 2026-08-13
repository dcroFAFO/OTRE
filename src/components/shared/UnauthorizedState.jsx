import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * @param {{ title?: string, description?: string, actionTo?: string, actionLabel?: string, className?: string }} props
 */
export default function UnauthorizedState({
  title = "Access restricted",
  description = "Your account does not have permission to view this area.",
  actionTo = "/",
  actionLabel = "Return home",
  className,
}) {
  return (
    <main className={cn("grid min-h-screen place-items-center bg-background px-5 py-12", className)}>
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-7 text-center shadow-sm" aria-labelledby="unauthorized-title">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 id="unauthorized-title" className="mt-5 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <Button asChild className="mt-6">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      </section>
    </main>
  );
}

