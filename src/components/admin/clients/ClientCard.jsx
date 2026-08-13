import { Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientStatusBadge, ClientTagBadge } from "./ClientStatusBadge";
import { cn } from "@/lib/utils";

/** @param {{ client: Record<string, any>, onView: (client: Record<string, any>) => void, selected?: boolean, onToggleSelect?: (() => void) | null }} props */
export default function ClientCard({ client, onView, selected = false, onToggleSelect }) {
  const name = client.full_name || "Unnamed customer";
  return (
    <article className={cn("rounded-lg border border-border bg-card p-4 shadow-sm", selected && "border-primary bg-primary/5")}>
      <div className="flex items-start gap-3">
        {onToggleSelect ? <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`Select ${name}`} className="mt-1" /> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-semibold">{name}</h2>
              <p className="truncate text-sm text-muted-foreground">{client.email || "No email"}</p>
              {client.phone ? <p className="text-sm text-muted-foreground">{client.phone}</p> : null}
            </div>
            <ClientStatusBadge value={client.status || "active"} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">Scooters</dt><dd className="mt-0.5 font-semibold">{client.scooter_count || 0}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Jobs</dt><dd className="mt-0.5 font-semibold">{client.job_count || 0}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Joined</dt><dd className="mt-0.5 whitespace-nowrap text-xs">{client.created_date ? format(new Date(client.created_date), "d MMM yyyy") : "Not set"}</dd></div>
          </dl>
          {(client.tags || []).length ? (
            <div className="mt-3 flex flex-wrap gap-1" aria-label="Customer tags">
              {client.tags.slice(0, 3).map((tag) => <ClientTagBadge key={tag} value={tag} />)}
              {client.tags.length > 3 ? <span className="text-xs text-muted-foreground">+{client.tags.length - 3}</span> : null}
            </div>
          ) : null}
          <Button type="button" variant="outline" size="touch" className="mt-4 w-full" onClick={() => onView(client)}><Eye aria-hidden="true" /> View customer</Button>
        </div>
      </div>
    </article>
  );
}
