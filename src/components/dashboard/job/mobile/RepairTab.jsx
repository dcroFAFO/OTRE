import React from "react";
import { Package, Wrench } from "lucide-react";
import IntakePanel from "../IntakePanel";
import JobPartsPanel from "../JobPartsPanel";
import QuotePanel from "../QuotePanel";

// Scooter-focused repair workspace: intake/scooter details, checklist,
// parts picker, and labour/consumables — all feeding the same Billing tab.
// No customer account fields or scheduling controls live here.
export default function RepairTab({ job, actor, canEdit, quoteReadOnly, onChange }) {
  return (
    <div className="space-y-5">
      <IntakePanel job={job} actor={actor} canEdit={canEdit} onChange={onChange} />

      <RepairSection title="Parts" icon={Package}>
        <JobPartsPanel job={job} actor={actor} canEdit={canEdit} onChange={onChange} />
      </RepairSection>

      <RepairSection title="Labour and Consumables" icon={Wrench}>
        <QuotePanel job={job} actor={actor} canEdit={canEdit && !quoteReadOnly} onChange={onChange} />
      </RepairSection>
    </div>
  );
}

function RepairSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-heading text-sm font-extrabold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}