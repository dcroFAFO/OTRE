import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Users, Filter } from "lucide-react";
import { listScoped } from "@/services/crmService";
import { LIFECYCLE_STAGES, CONTACT_STATUSES } from "@/config/crmConfig";
import { useCRMUser } from "@/hooks/useCRMUser";
import CRMPageHeader from "@/components/crm/CRMPageHeader";
import CRMEmptyState from "@/components/crm/CRMEmptyState";
import ContactTable from "@/components/crm/contact/ContactTable";
import ContactFormModal from "@/components/crm/contact/ContactFormModal";
import ContactDetailDrawer from "@/components/crm/contact/ContactDetailDrawer";

export default function CRMContacts() {
  const { user, scope, can } = useCRMUser();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState("all");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);

  const openId = params.get("contact");
  const setOpenId = (id) => setParams(id ? { contact: id } : {}, { replace: true });

  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ["crm-contacts", scope, user?.id],
    queryFn: () => listScoped("CRMContact", scope, user?.id),
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      if (lifecycle !== "all" && c.lifecycle_stage !== lifecycle) return false;
      if (status !== "all" && c.contact_status !== status) return false;
      if (q) {
        const hay = `${c.full_name || ""} ${c.email || ""} ${c.phone || ""} ${c.company_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, search, lifecycle, status]);

  return (
    <div>
      <CRMPageHeader
        title="Contacts" icon={Users} count={contacts.length}
        subtitle="Manage your people and relationships"
        actions={can("crm.create") && <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Contact</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone, company..." className="pl-9" />
        </div>
        <FilterSelect value={lifecycle} onChange={setLifecycle} all="All lifecycle" options={LIFECYCLE_STAGES} />
        <FilterSelect value={status} onChange={setStatus} all="All status" options={CONTACT_STATUSES} />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card h-64 grid place-items-center"><div className="h-7 w-7 rounded-full border-4 border-border border-t-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <CRMEmptyState icon={Users} title="No contacts yet" message="Convert a lead or create a contact." actionLabel={can("crm.create") ? "New Contact" : null} onAction={() => setCreating(true)} />
        </div>
      ) : (
        <ContactTable contacts={filtered} onOpen={setOpenId} />
      )}

      {creating && <ContactFormModal open={creating} onClose={() => setCreating(false)} actor={user} onSaved={refetch} />}
      <ContactDetailDrawer contactId={openId} actor={user} open={!!openId} onClose={() => setOpenId(null)} onChange={refetch} canEdit={can("crm.update.all") || can("crm.update.own")} />
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