import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Building2, Pencil, Loader2, User } from "lucide-react";
import CRMBadge from "@/components/crm/CRMBadge";
import CRMTimeline from "@/components/crm/CRMTimeline";
import CRMQuickActions from "@/components/crm/CRMQuickActions";
import CRMOwnerSelector from "@/components/crm/CRMOwnerSelector";
import ContactFormModal from "./ContactFormModal";
import { LIFECYCLE_MAP, CONTACT_STATUS_MAP, SOURCE_MAP, fullName } from "@/config/crmConfig";
import { updateContact, logActivity } from "@/services/crmService";

export default function ContactDetailDrawer({ contactId, actor, open, onClose, onChange, canEdit }) {
  const [contact, setContact] = useState(null);
  const [editing, setEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => { if (contactId) base44.entities.CRMContact.get(contactId).then(setContact); }, [contactId]);
  useEffect(() => { if (open) load(); }, [contactId, open, load]);
  useEffect(() => { if (!open) setContact(null); }, [open]);

  const bump = () => { load(); setRefreshKey((k) => k + 1); onChange?.(); };
  const setOwner = async (ownerId) => { await updateContact(contact.id, { owner_id: ownerId }); await logActivity({ relatedType: "contact", relatedId: contact.id, activityType: "assignment_change", title: "Owner changed", actor }); bump(); };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {!contact ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-primary text-primary-foreground p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-heading text-xl font-extrabold flex items-center gap-2"><User className="h-5 w-5 text-primary-foreground/70" /> {fullName(contact)}</h2>
                  {contact.job_title && <p className="text-sm text-primary-foreground/70 mt-0.5">{contact.job_title}{contact.company_name ? ` · ${contact.company_name}` : ""}</p>}
                </div>
                <CRMBadge value={contact.contact_status} map={CONTACT_STATUS_MAP} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-foreground/70">
                {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-primary-foreground"><Mail className="h-3 w-3" /> {contact.email}</a>}
                {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-primary-foreground"><Phone className="h-3 w-3" /> {contact.phone}</a>}
                {contact.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {contact.company_name}</span>}
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Meta label="Lifecycle"><CRMBadge value={contact.lifecycle_stage} map={LIFECYCLE_MAP} /></Meta>
                <Meta label="Source"><CRMBadge value={contact.lead_source} map={SOURCE_MAP} /></Meta>
              </div>

              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-44"><CRMOwnerSelector value={contact.owner_id} onChange={setOwner} /></div>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                </div>
              )}

              <CRMQuickActions relatedType="contact" relatedId={contact.id} actor={actor} onLogged={bump} />

              <div>
                <h3 className="font-heading font-bold text-sm mb-3">Timeline</h3>
                <CRMTimeline relatedType="contact" relatedId={contact.id} refreshKey={refreshKey} />
              </div>
            </div>
          </div>
        )}
        {editing && <ContactFormModal open={editing} onClose={() => setEditing(false)} contact={contact} actor={actor} onSaved={bump} />}
      </SheetContent>
    </Sheet>
  );
}

function Meta({ label, children }) {
  return <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>{children}</div>;
}