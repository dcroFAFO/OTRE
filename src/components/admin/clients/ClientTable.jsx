import React from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { ClientStatusBadge, ClientTagBadge } from "./ClientStatusBadge";
import { format } from "date-fns";

export default function ClientTable({ clients, onView }) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-2.5 md:hidden">
        {clients.map((c) => (
          <button key={c.id} onClick={() => onView(c)}
            className="w-full text-left rounded-xl border border-border bg-card p-3.5 active:bg-secondary/40 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium truncate">{c.full_name}</p>
              <ClientStatusBadge value={c.status || "active"} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">{c.email || "—"}</p>
            {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {(c.tags || []).slice(0, 2).map((t) => <ClientTagBadge key={t} value={t} />)}
                {(c.tags || []).length > 2 && <span className="text-[11px] text-muted-foreground">+{c.tags.length - 2}</span>}
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {c.created_date ? format(new Date(c.created_date), "d MMM yyyy") : "—"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Tags</th>
              <th className="px-4 py-3 font-semibold">Signed up</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 max-w-[200px]">
                  <button onClick={() => onView(c)} className="font-medium text-left hover:underline truncate block">{c.full_name}</button>
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  <p className="truncate">{c.email || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{c.phone || ""}</p>
                </td>
                <td className="px-4 py-3"><ClientStatusBadge value={c.status || "active"} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {(c.tags || []).slice(0, 2).map((t) => <ClientTagBadge key={t} value={t} />)}
                    {(c.tags || []).length > 2 && <span className="text-[11px] text-muted-foreground">+{c.tags.length - 2}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {c.created_date ? format(new Date(c.created_date), "d MMM yyyy") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={() => onView(c)}><Eye className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}