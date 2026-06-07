import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Building2, Briefcase, Pencil, ArrowRightLeft, Loader2, User } from "lucide-react";
import CRMBadge from "@/components/crm/CRMBadge";
import CRMTimeline from "@/components/crm/CRMTimeline";
import CRMQuickActions from "@/components/crm/CRMQuickActions";
import CRMOwnerSelector from "@/components/crm/CRMOwnerSelector";
import LeadFormModal from "./LeadFormModal";
import { LEAD_STATUSES, LEAD_STATUS_MAP, SOURCE_MAP, PRIORITY_MAP, fullName } from "@/config/crmConfig";
import { updateLead, convertLead, logActivity } from "@/services/crmService";
import { toast } from "sonner";

export default function LeadDetailDrawer({ leadId, actor, open, onClose, onChange, canEdit }) {
  const [lead, setLead] = useState(null);
  const [editing, setEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [converting, setConverting] = useState(false);

  const load = useCallback(() => { if (leadId) base44.entities.CRMLead.get(leadId).then(setLead); }, [leadId]);
  useEffect(() => { if (open) load(); }, [leadId, open, load]);
  useEffect(() => { if (!open) setLead(null); }, [open]);

  const bump = () => { load(); setRefreshKey((k) => k + 1); onChange?.(); };

  const changeStatus = async (status) => {
    await updateLead(lead.id, { lead_status: status }, actor);
    await logActivity({ relatedType: "lead", relatedId: lead.id, activityType: "status_change", title: `Status → ${LEAD_STATUS_MAP[status]?.label || status}`, actor });
    bump();
  };

  const setOwner = async (ownerId) => { await updateLead(lead.id, { owner_id: ownerId }, actor); await logActivity({ relatedType: "lead", relatedId: lead.id, activityType: "assignment_change", title: "Owner changed", actor }); bump(); };

  const convert = async () => {
    setConverting(true);
    try {
      const { contact } = await convertLead(lead, { createCompany: true }, actor);
      toast.success("Lead converted to contact");
      bump();
    } finally { setConverting(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {!lead ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-heading text-xl font-extrabold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary-foreground/70" /> {fullName(lead)}
                  </h2>
                  {lead.job_title && <p className="text-sm text-primary-foreground/70 mt-0.5">{lead.job_title}{lead.company_name ? ` · ${lead.company_name}` : ""}</p>}
                </div>
                <CRMBadge value={lead.lead_status} map={LEAD_STATUS_MAP} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-foreground/70">
                {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-primary-foreground"><Mail className="h-3 w-3" /> {lead.email}</a>}
                {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-primary-foreground"><Phone className="h-3 w-3" /> {lead.phone}</a>}
                {lead.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {lead.company_name}</span>}
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Meta row */}
              <div className="grid grid-cols-2 gap-3">
                <Meta label="Source"><CRMBadge value={lead.lead_source} map={SOURCE_MAP} /></Meta>
                <Meta label="Priority"><CRMBadge value={lead.priority} map={PRIORITY_MAP} /></Meta>
                <Meta label="Score"><span className="text-sm font-semibold tabular-nums">{lead.score || 0}</span></Meta>
                <Meta label="Expected value"><span className="text-sm font-semibold">{lead.expected_value ? `$${Number(lead.expected_value).toLocaleString()}` : "—"}</span></Meta>
              </div>

              {canEdit && lead.lead_status !== "converted" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={lead.lead_status} onValueChange={changeStatus}>
                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAD_STATUSES.filter((s) => s.key !== "converted").map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="w-44"><CRMOwnerSelector value={lead.owner_id} onChange={setOwner} /></div>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                  <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={convert} disabled={converting}>
                    {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />} Convert
                  </Button>
                </div>
              )}

              {lead.qualification_notes && (
                <div className="rounded-xl bg-secondary/50 p-3 text-sm text-muted-foreground">{lead.qualification_notes}</div>
              )}

              {/* Quick actions */}
              <CRMQuickActions relatedType="lead" relatedId={lead.id} actor={actor} onLogged={bump} />

              {/* Timeline */}
              <div>
                <h3 className="font-heading font-bold text-sm mb-3">Timeline</h3>
                <CRMTimeline relatedType="lead" relatedId={lead.id} refreshKey={refreshKey} />
              </div>
            </div>
          </div>
        )}
        {editing && <LeadFormModal open={editing} onClose={() => setEditing(false)} lead={lead} actor={actor} onSaved={bump} />}
      </SheetContent>
    </Sheet>
  );
}

function Meta({ label, children }) {
  return <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>{children}</div>;
}