import React from "react";
import InvoicePanel from "../InvoicePanel";

// Billing tab: review of repair-generated parts/labour, invoice
// preview/generation/issuing and payment management. Reuses the same
// InvoicePanel used elsewhere — no duplicate invoice logic.
export default function BillingReviewTab({ job, actor, canEdit, invoiceReadOnly, onChange }) {
  return (
    <InvoicePanel job={job} actor={actor} canEdit={canEdit && !invoiceReadOnly} onChange={onChange} />
  );
}