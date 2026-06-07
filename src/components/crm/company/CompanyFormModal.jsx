import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPANY_TYPES } from "@/config/crmConfig";
import { createCompany, updateCompany, findDuplicateCompany } from "@/services/crmService";
import CRMOwnerSelector from "@/components/crm/CRMOwnerSelector";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

const empty = { name: "", domain: "", website: "", phone: "", industry: "", company_size: "", company_type: "prospect", owner_id: null, description: "" };

export default function CompanyFormModal({ open, onClose, company, actor, onSaved }) {
  const [form, setForm] = useState(company || empty);
  const [saving, setSaving] = useState(false);
  const [dupe, setDupe] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Company name is required."); return; }
    setSaving(true);
    try {
      if (!company) {
        const d = await findDuplicateCompany({ domain: form.domain, name: form.name });
        if (d && !dupe) { setDupe(d); setSaving(false); return; }
      }
      if (company) await updateCompany(company.id, form);
      else await createCompany(form, actor);
      toast.success(company ? "Company updated" : "Company created");
      onSaved?.();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{company ? "Edit Company" : "New Company"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Company name *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Domain"><Input value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="acme.com" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry"><Input value={form.industry} onChange={(e) => set("industry", e.target.value)} /></Field>
            <Field label="Company size"><Input value={form.company_size} onChange={(e) => set("company_size", e.target.value)} placeholder="11-50" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.company_type} onValueChange={(v) => set("company_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMPANY_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Owner"><CRMOwnerSelector value={form.owner_id} onChange={(v) => set("owner_id", v)} /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="h-20" /></Field>

          {dupe && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>A company with this domain/name already exists ({dupe.name}). Click Save again to create anyway.</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{company ? "Save changes" : "Create company"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}