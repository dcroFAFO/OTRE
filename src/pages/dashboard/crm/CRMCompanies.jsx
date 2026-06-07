import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Building2, Filter } from "lucide-react";
import { listScoped } from "@/services/crmService";
import { COMPANY_TYPES } from "@/config/crmConfig";
import { useCRMUser } from "@/hooks/useCRMUser";
import CRMPageHeader from "@/components/crm/CRMPageHeader";
import CRMEmptyState from "@/components/crm/CRMEmptyState";
import CompanyTable from "@/components/crm/company/CompanyTable";
import CompanyFormModal from "@/components/crm/company/CompanyFormModal";
import CompanyDetailDrawer from "@/components/crm/company/CompanyDetailDrawer";

export default function CRMCompanies() {
  const { user, scope, can } = useCRMUser();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [creating, setCreating] = useState(false);

  const openId = params.get("company");
  const setOpenId = (id) => setParams(id ? { company: id } : {}, { replace: true });

  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ["crm-companies", scope, user?.id],
    queryFn: () => listScoped("CRMCompany", scope, user?.id),
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter((c) => {
      if (type !== "all" && c.company_type !== type) return false;
      if (q) {
        const hay = `${c.name || ""} ${c.domain || ""} ${c.industry || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [companies, search, type]);

  return (
    <div>
      <CRMPageHeader
        title="Companies" icon={Building2} count={companies.length}
        subtitle="Manage your accounts and organizations"
        actions={can("crm.create") && <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Company</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, domain, industry..." className="pl-9" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-auto min-w-[130px] gap-1"><Filter className="h-3.5 w-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {COMPANY_TYPES.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card h-64 grid place-items-center"><div className="h-7 w-7 rounded-full border-4 border-border border-t-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <CRMEmptyState icon={Building2} title="No companies yet" message="Add your first company or import company data." actionLabel={can("crm.create") ? "New Company" : null} onAction={() => setCreating(true)} />
        </div>
      ) : (
        <CompanyTable companies={filtered} onOpen={setOpenId} />
      )}

      {creating && <CompanyFormModal open={creating} onClose={() => setCreating(false)} actor={user} onSaved={refetch} />}
      <CompanyDetailDrawer companyId={openId} actor={user} open={!!openId} onClose={() => setOpenId(null)} onChange={refetch} canEdit={can("crm.update.all") || can("crm.update.own")} />
    </div>
  );
}