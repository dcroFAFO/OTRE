import React from "react";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientStatusBadge, ClientTagBadge } from "./ClientStatusBadge";
import ClientCard from "./ClientCard";

/** @param {{ clients: Array<Record<string, any>>, onView: (client: Record<string, any>) => void, selected?: Set<string> | null, onToggleSelect?: ((id: string) => void) | null, onToggleSelectAll?: (() => void) | null }} props */
export default function ClientTable({ clients, onView, selected, onToggleSelect, onToggleSelectAll }) {
  const selectable = Boolean(onToggleSelect && selected);
  const allSelected = selectable && clients.length > 0 && clients.every((client) => selected?.has(client.id));
  const someSelected = selectable && clients.some((client) => selected?.has(client.id));

  return (
    <>
      <div className="space-y-3 md:hidden">
        {selectable ? (
          <div className="flex min-h-11 items-center gap-3 border-y border-border px-1">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={() => onToggleSelectAll?.()}
              aria-label="Select all visible customers"
            />
            <span className="text-sm font-medium">Select all visible customers</span>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onView={onView}
              selected={selected?.has(client.id) || false}
              onToggleSelect={selectable ? () => onToggleSelect?.(client.id) : null}
            />
          ))}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Customer accounts and service activity</caption>
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
              {selectable ? (
                <th className="w-10 px-4 py-3">
                  <Checkbox checked={allSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={() => onToggleSelectAll?.()} aria-label="Select all visible customers" />
                </th>
              ) : null}
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Scooters</th>
              <th className="px-4 py-3 font-semibold">Jobs</th>
              <th className="px-4 py-3 font-semibold">Tags</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((client) => (
              <tr key={client.id} className={`transition-colors hover:bg-secondary/30 ${selected?.has(client.id) ? "bg-primary/5" : ""}`}>
                {selectable ? (
                  <td className="px-4 py-3">
                    <Checkbox checked={selected?.has(client.id) || false} onCheckedChange={() => onToggleSelect?.(client.id)} aria-label={`Select ${client.full_name || "customer"}`} />
                  </td>
                ) : null}
                <td className="max-w-[200px] px-4 py-3">
                  <button type="button" onClick={() => onView(client)} className="block max-w-full truncate text-left font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {client.full_name || "Unnamed customer"}
                  </button>
                </td>
                <td className="max-w-[180px] px-4 py-3">
                  <p className="truncate">{client.email || "No email"}</p>
                  <p className="text-[11px] text-muted-foreground">{client.phone || ""}</p>
                </td>
                <td className="px-4 py-3"><ClientStatusBadge value={client.status || "active"} /></td>
                <td className="max-w-[180px] px-4 py-3"><p>{client.scooter_count || 0}</p>{(client.scooters || []).length ? <p className="truncate text-[11px] text-muted-foreground">{client.scooters.join(", ")}</p> : null}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{client.job_count || 0}</td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[160px] flex-wrap gap-1">
                    {(client.tags || []).slice(0, 2).map((tag) => <ClientTagBadge key={tag} value={tag} />)}
                    {(client.tags || []).length > 2 ? <span className="text-[11px] text-muted-foreground">+{client.tags.length - 2}</span> : null}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{client.created_date ? format(new Date(client.created_date), "d MMM yyyy") : "Not set"}</td>
                <td className="px-2 py-2 text-right">
                  <Button type="button" variant="ghost" size="iconTouch" title="View" aria-label={`View ${client.full_name || "customer"}`} onClick={() => onView(client)}><Eye aria-hidden="true" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
