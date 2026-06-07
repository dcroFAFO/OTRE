import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Globe, Phone, Pencil, Loader2, Building2, User } from "lucide-react";
import CRMBadge from "@/components/crm/CRMBadge";
import CRMTimeline from "@/components/crm/CRMTimeline";
import CRMQuickActions from "@/components/crm/CRMQuickActions";
import CRMOwnerSelector from "@/components/crm/CRMOwnerSelector";
import CompanyFormModal from "./CompanyFormModal";
import { COMPANY_TYPE_MAP, LIFECYCLE_MAP, fullName } from "@/config/crmConfig";
import { updateCompany, logActivity } from "@/services/crmService";

export default function CompanyDetailDrawer({ companyId, actor, open, onClose, onChange, canEdit }) {
  const [company, setCompany] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    if (!companyId) return;
    base44.entities.CRMCompany.get(companyId).then(setCompany);
    base44.entities.CRMContact.filter({ company_id: companyId, archived: false }, "-updated_date", 50).then(setContacts);
  }, [companyId]);
  useEffect(() => { if (open) load(); }, [companyId, open, load]);
  useEffect(() => { if (!open) { setCompany(null); setContacts([]); } }, [open]);

  const bump = () => { load(); setRefreshKey((k) => k + 1); onChange?.(); };
  const setOwner = async (ownerId) => { await updateCompany(company.id, { owner_id: ownerId }); await logActivity({ relatedType: "company", relatedId: company.id, activityType: "assignment_change", title: "Owner changed", actor }); bump(); };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {!company ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-primary text-primary-foreground p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-heading text-xl font-extrabold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary-foreground/70" /> {company.name}</h2>
                <CRMBadge value={company.company_type} map={COMPANY_TYPE_MAP} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-foreground/70">
                {company.domain && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {company.domain}</span>}
                {company.phone && <a href={`tel:${company.phone}`} className="flex items-center gap-1 hover:text-primary-foreground"><Phone className="h-3 w-3" /> {company.phone}</a>}
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Meta label="Industry"><span className="text-sm">{company.industry || "—"}</span></Meta>
                <Meta label="Size"><span className="text-sm">{company.company_size || "—"}</span></Meta>
                <Meta label="Lifecycle"><CRMBadge value={company.lifecycle_stage} map={LIFECYCLE_MAP} /></Meta>
                <Meta label="Open deals"><span className="text-sm font-semibold tabular-nums">{company.open_deal_count || 0}</span></Meta>
              </div>

              {company.description && <p className="text-sm text-muted-foreground rounded-xl bg-secondary/50 p-3">{company.description}</p>}

              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-44"><CRMOwnerSelector value={company.owner_id} onChange={setOwner} /></div>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                </div>
              )}

              {/* Related contacts */}
              <div>
                <h3 className="font-heading font-bold text-sm mb-2">Contacts at {company.name} ({contacts.length})</h3>
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {contacts.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{fullName(c)}</span>
                        {c.job_title && <span className="text-xs text-muted-foreground">· {c.job_title}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <CRMQuickActions relatedType="company" relatedId={company.id} actor={actor} onLogged={bump} />

              <div>
                <h3 className="font-heading font-bold text-sm mb-3">Timeline</h3>
                <CRMTimeline relatedType="company" relatedId={company.id} refreshKey={refreshKey} />
              </div>
            </div>
          </div>
        )}
        {editing && <CompanyFormModal open={editing} onClose={() => setEditing(false)} company={company} actor={actor} onSaved={bump} />}
      </SheetContent>
    </Sheet>
  );
}

function Meta({ label, children }) {
  return <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>{children}</div>;
}