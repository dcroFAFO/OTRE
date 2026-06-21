import React from "react";
import { CreditCard, FileText, Package, ShieldCheck } from "lucide-react";
import JobPartsPanel from "./JobPartsPanel";
import QuotePanel from "./QuotePanel";
import InvoicePanel from "./InvoicePanel";

export default function BillingPanel({ job, actor, canEdit, quoteReadOnly, invoiceReadOnly, onChange }) {
  return (
    <div className="space-y-5">
      <BillingSection
        title="Parts"
        description="Add parts from the existing search and catalogue, then push selected parts onto the invoice."
        icon={Package}
      >
        <JobPartsPanel job={job} actor={actor} canEdit={canEdit} onChange={onChange} />
      </BillingSection>

      <BillingSection
        title="Labour and Consumables"
        description="Manage labour, fees, surcharges, consumables, and diagnosis notes before customer invoicing."
        icon={FileText}
      >
        <QuotePanel job={job} actor={actor} canEdit={canEdit && !quoteReadOnly} onChange={onChange} />
      </BillingSection>

      <BillingSection
        title="Invoice"
        description="Generate, edit, preview, and control when the customer can see the invoice."
        icon={CreditCard}
      >
        <InvoicePanel job={job} actor={actor} canEdit={canEdit && !invoiceReadOnly} onChange={onChange} />
      </BillingSection>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Internal costing notes and internal-only invoices stay hidden from customers until the invoice is sent or marked visible.</p>
      </div>
    </div>
  );
}

function BillingSection({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-heading text-sm font-extrabold text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}