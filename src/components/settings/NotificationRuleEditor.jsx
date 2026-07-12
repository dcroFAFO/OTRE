import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selects = [
  ["default_state", ["on","off","not_applicable"]], ["toggleable_by", ["not_toggleable","admin","staff","customer","admin_and_staff","admin_and_customer"]],
  ["notification_type", ["transactional","operational","security","marketing","system"]], ["consent_requirement", ["none","transactional","marketing"]],
  ["timing", ["immediate","delayed","digest","manual_only"]], ["active_status", ["active","archived"]],
];

export default function NotificationRuleEditor({ rule, onClose, onSave, saving }) {
  const [form, setForm] = useState(rule || {});
  useEffect(() => setForm(rule || {}), [rule]);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return <Dialog open={!!rule} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{rule?.event_name}</DialogTitle></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      {[['can_receive','Allowed'],['mandatory','Mandatory'],['toggleable','Toggleable']].map(([key,label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form[key]} onChange={(e) => set(key,e.target.checked)} />{label}</label>)}
      {selects.map(([key, options]) => <div key={key}><Label htmlFor={`rule-${key}`}>{key.replaceAll('_',' ')}</Label><select id={`rule-${key}`} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form[key] || ''} onChange={(e) => set(key,e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select></div>)}
      <div><Label htmlFor="rule-delay">Delay minutes</Label><Input id="rule-delay" type="number" min="0" value={form.delay_minutes || 0} onChange={(e) => set('delay_minutes',Number(e.target.value))} /></div>
      <div><Label htmlFor="rule-digest">Digest schedule</Label><Input id="rule-digest" value={form.digest_schedule || ''} onChange={(e) => set('digest_schedule',e.target.value)} /></div>
      <div className="sm:col-span-2"><Label htmlFor="rule-template">Template reference</Label><Input id="rule-template" value={form.template_reference || ''} onChange={(e) => set('template_reference',e.target.value)} /></div>
    </div>
    <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={saving} onClick={() => onSave(form)}>{saving ? 'Saving…' : 'Save rule'}</Button></div>
  </DialogContent></Dialog>;
}