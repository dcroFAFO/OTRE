import React from "react";
import CRMBadge from "@/components/crm/CRMBadge";
import { LIFECYCLE_MAP, CONTACT_STATUS_MAP, fullName } from "@/config/crmConfig";
import { Mail, Phone, Building2 } from "lucide-react";

export default function ContactTable({ contacts, onOpen }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground text-left">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Company</th>
            <th className="px-4 py-3 font-medium hidden lg:table-cell">Lifecycle</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} onClick={() => onOpen(c.id)} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium">{fullName(c)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                  {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                </p>
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                {c.company_name ? <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{c.company_name}</span> : "—"}
              </td>
              <td className="px-4 py-3 hidden lg:table-cell"><CRMBadge value={c.lifecycle_stage} map={LIFECYCLE_MAP} /></td>
              <td className="px-4 py-3"><CRMBadge value={c.contact_status} map={CONTACT_STATUS_MAP} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}