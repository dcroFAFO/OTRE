import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LIFECYCLE_STAGES, LEAD_SOURCES } from "@/config/crmConfig";
import { createContact, updateContact, findDuplicateContact } from "@/services/crmService";
import CRMOwnerSelector from "@/components/crm/CRMOwnerSelector";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

const empty = { first_name: "", last_name: "", email: "", phone: "", mobile_phone: "", job_title: "", company_name: "", lifecycle_stage: "lead", lead_source: "manual_entry", owner_id: null, email_opt_in: true };

export default function ContactFormModal({ open, onClose, contact, actor, onSaved }) {
  const [form, setForm] = useState(contact || empty);
  const [saving, setSaving] = useState(false);
  const [dupe, setDupe] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.first_name && !form.last_name && !form.email) { toast.error("Enter a name or email."); return; }
    if (form.email && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) { toast.error("Invalid email address."); return; }
    setSaving(true);
    try {
      if (!contact && (form.email || form.phone)) {
        const d = await findDuplicateContact({ email: form.email, phone: form.phone });
        if (d && !dupe) { setDupe(d); setSaving(false); return; }
      }
      if (contact) await updateContact(contact.id, form);
      else await createContact(form, actor);
      toast.success(contact ? "Contact updated" : "Contact created");
      onSaved?.();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{contact ? "Edit Contact" : "New Contact"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
            <Field label="Last name"><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company"><Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
            <Field label="Job title"><Input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lifecycle">
              <Select value={form.lifecycle_stage} onValueChange={(v) => set("lifecycle_stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LIFECYCLE_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Source">
              <Select value={form.lead_source} onValueChange={(v) => set("lead_source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_SOURCES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Owner"><CRMOwnerSelector value={form.owner_id} onChange={(v) => set("owner_id", v)} /></Field>

          {dupe && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>A contact with this email/phone already exists ({dupe.full_name}). Click Save again to create anyway.</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{contact ? "Save changes" : "Create contact"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}