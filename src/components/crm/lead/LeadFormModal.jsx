import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_SOURCES, PRIORITIES } from "@/config/crmConfig";
import { createLead, updateLead, findDuplicateContact } from "@/services/crmService";
import CRMOwnerSelector from "@/components/crm/CRMOwnerSelector";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

const empty = { first_name: "", last_name: "", email: "", phone: "", company_name: "", job_title: "", website: "", lead_source: "manual_entry", priority: "medium", owner_id: null, expected_value: "", qualification_notes: "" };

export default function LeadFormModal({ open, onClose, lead, actor, onSaved }) {
  const [form, setForm] = useState(lead || empty);
  const [saving, setSaving] = useState(false);
  const [dupe, setDupe] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.first_name && !form.last_name && !form.email) {
      toast.error("Enter a name or email.");
      return;
    }
    if (form.email && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) {
      toast.error("Invalid email address.");
      return;
    }
    setSaving(true);
    try {
      if (!lead && (form.email || form.phone)) {
        const d = await findDuplicateContact({ email: form.email, phone: form.phone });
        if (d && !dupe) { setDupe(d); setSaving(false); return; }
      }
      const payload = { ...form, expected_value: form.expected_value ? Number(form.expected_value) : undefined };
      if (lead) await updateLead(lead.id, payload, actor);
      else await createLead(payload, actor);
      toast.success(lead ? "Lead updated" : "Lead created");
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{lead ? "Edit Lead" : "New Lead"}</DialogTitle></DialogHeader>
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
            <Field label="Source">
              <Select value={form.lead_source} onValueChange={(v) => set("lead_source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_SOURCES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expected value ($)"><Input type="number" value={form.expected_value} onChange={(e) => set("expected_value", e.target.value)} /></Field>
            <Field label="Owner"><CRMOwnerSelector value={form.owner_id} onChange={(v) => set("owner_id", v)} /></Field>
          </div>
          <Field label="Notes"><Textarea value={form.qualification_notes} onChange={(e) => set("qualification_notes", e.target.value)} className="h-20" /></Field>

          {dupe && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>A contact with this email/phone already exists ({dupe.full_name}). Click Save again to create anyway.</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{lead ? "Save changes" : "Create lead"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}