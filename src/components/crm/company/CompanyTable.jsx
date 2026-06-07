import React from "react";
import CRMBadge from "@/components/crm/CRMBadge";
import { COMPANY_TYPE_MAP } from "@/config/crmConfig";
import { Globe, Phone } from "lucide-react";

export default function CompanyTable({ companies, onOpen }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground text-left">
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Industry</th>
            <th className="px-4 py-3 font-medium hidden lg:table-cell">Size</th>
            <th className="px-4 py-3 font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} onClick={() => onOpen(c.id)} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  {c.domain && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{c.domain}</span>}
                  {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                </p>
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.industry || "—"}</td>
              <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{c.company_size || "—"}</td>
              <td className="px-4 py-3"><CRMBadge value={c.company_type} map={COMPANY_TYPE_MAP} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}