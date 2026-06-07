import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Sparkles, Filter } from "lucide-react";
import { listScoped } from "@/services/crmService";
import { LEAD_STATUSES, LEAD_SOURCES, PRIORITIES } from "@/config/crmConfig";
import { useCRMUser } from "@/hooks/useCRMUser";
import CRMPageHeader from "@/components/crm/CRMPageHeader";
import CRMEmptyState from "@/components/crm/CRMEmptyState";
import LeadTable from "@/components/crm/lead/LeadTable";
import LeadFormModal from "@/components/crm/lead/LeadFormModal";
import LeadDetailDrawer from "@/components/crm/lead/LeadDetailDrawer";

export default function CRMLeads() {
  const { user, scope, can } = useCRMUser();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [priority, setPriority] = useState("all");
  const [creating, setCreating] = useState(false);

  const openId = params.get("lead");
  const setOpenId = (id) => setParams(id ? { lead: id } : {}, { replace: true });

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["crm-leads", scope, user?.id],
    queryFn: () => listScoped("CRMLead", scope, user?.id),
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) => {
      if (status !== "all" && l.lead_status !== status) return false;
      if (source !== "all" && l.lead_source !== source) return false;
      if (priority !== "all" && l.priority !== priority) return false;
      if (q) {
        const hay = `${l.full_name || ""} ${l.first_name || ""} ${l.last_name || ""} ${l.email || ""} ${l.phone || ""} ${l.company_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, status, source, priority]);

  return (
    <div>
      <CRMPageHeader
        title="Leads" icon={Sparkles} count={leads.length}
        subtitle="Capture and qualify new leads"
        actions={can("crm.create") && <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Lead</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9" />
        </div>
        <FilterSelect value={status} onChange={setStatus} all="All status" options={LEAD_STATUSES} />
        <FilterSelect value={source} onChange={setSource} all="All sources" options={LEAD_SOURCES} />
        <FilterSelect value={priority} onChange={setPriority} all="All priority" options={PRIORITIES} />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card h-64 grid place-items-center"><div className="h-7 w-7 rounded-full border-4 border-border border-t-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <CRMEmptyState icon={Sparkles} title="No leads yet" message="Add a lead manually or import a CSV." actionLabel={can("crm.create") ? "New Lead" : null} onAction={() => setCreating(true)} />
        </div>
      ) : (
        <LeadTable leads={filtered} onOpen={setOpenId} />
      )}

      {creating && <LeadFormModal open={creating} onClose={() => setCreating(false)} actor={user} onSaved={refetch} />}
      <LeadDetailDrawer leadId={openId} actor={user} open={!!openId} onClose={() => setOpenId(null)} onChange={refetch} canEdit={can("crm.update.all") || can("crm.update.own")} />
    </div>
  );
}

function FilterSelect({ value, onChange, all, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto min-w-[130px] gap-1"><Filter className="h-3.5 w-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}