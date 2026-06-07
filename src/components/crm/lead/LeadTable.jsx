import React from "react";
import CRMBadge from "@/components/crm/CRMBadge";
import { LEAD_STATUS_MAP, SOURCE_MAP, PRIORITY_MAP, fullName } from "@/config/crmConfig";
import { Mail, Phone, Building2 } from "lucide-react";

export default function LeadTable({ leads, onOpen }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground text-left">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Company</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium hidden lg:table-cell">Source</th>
            <th className="px-4 py-3 font-medium hidden lg:table-cell">Priority</th>
            <th className="px-4 py-3 font-medium text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} onClick={() => onOpen(l.id)} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium">{fullName(l)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  {l.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{l.email}</span>}
                  {l.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>}
                </p>
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                {l.company_name ? <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{l.company_name}</span> : "—"}
              </td>
              <td className="px-4 py-3"><CRMBadge value={l.lead_status} map={LEAD_STATUS_MAP} /></td>
              <td className="px-4 py-3 hidden lg:table-cell"><CRMBadge value={l.lead_source} map={SOURCE_MAP} /></td>
              <td className="px-4 py-3 hidden lg:table-cell"><CRMBadge value={l.priority} map={PRIORITY_MAP} /></td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">{l.expected_value ? `$${Number(l.expected_value).toLocaleString()}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}