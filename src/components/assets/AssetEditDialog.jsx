import React, { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldShell } from "@/components/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/** @type {Array<{ key: string, label: string, required?: boolean, type?: React.HTMLInputTypeAttribute, inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }>} */
const FIELDS = [
  { key: "make", label: "Make" },
  { key: "model", label: "Model", required: true },
  { key: "year", label: "Year", type: "number", inputMode: "numeric" },
  { key: "serial_number", label: "Serial number" },
  { key: "colour", label: "Colour" },
  { key: "battery_voltage", label: "Battery voltage" },
];

/** @param {{ asset: Record<string, any>, onSave: (asset: Record<string, any>) => Promise<void>, onClose: () => void }} props */
export default function AssetEditDialog({ asset, customers = [], customersLoading = false, onSave, onClose }) {
  const baseId = useId().replace(/:/g, "");
  const [data, setData] = useState(asset);
  const [saving, setSaving] = useState(false);
  const [modelError, setModelError] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const set = (key, value) => {
    setData((current) => ({ ...current, [key]: value }));
    if (key === "model") setModelError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!String(data.model || "").trim()) {
      setModelError("Enter the scooter model.");
      document.getElementById(`${baseId}-model`)?.focus();
      return;
    }
    if (!String(data.customer_id || "").trim()) {
      setOwnerError("Select the customer who owns this scooter.");
      document.getElementById(`${baseId}-owner`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{data.id ? "Edit asset" : "New asset"}</DialogTitle>
          <DialogDescription>Assign an owner and record the scooter details used in customer and job history.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${baseId}-owner`}>Owner <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Select value={data.customer_id || data.customer_account_id || ""} onValueChange={(value) => { set("customer_id", value); setOwnerError(""); }} disabled={customersLoading}>
                <SelectTrigger id={`${baseId}-owner`} aria-required="true" aria-invalid={Boolean(ownerError)} aria-describedby={ownerError ? `${baseId}-owner-error` : undefined}><SelectValue placeholder={customersLoading ? "Loading customers…" : "Select customer"} /></SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.reference || customer.customer_id || customer.id}>{customer.full_name || customer.name || customer.email || "Customer"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ownerError ? <p id={`${baseId}-owner-error`} className="text-sm text-destructive" role="alert">{ownerError}</p> : null}
            </div>
            {FIELDS.map((field) => (
              <FieldShell key={field.key} id={`${baseId}-${field.key}`} label={field.label} required={field.required} error={field.key === "model" ? modelError : undefined}>
                <Input type={field.type || "text"} inputMode={field.inputMode} value={data[field.key] || ""} onChange={(event) => set(field.key, event.target.value)} />
              </FieldShell>
            ))}
            <FieldShell id={`${baseId}-odometer`} label="Odometer (km)">
              <Input type="number" min="0" inputMode="numeric" value={data.odometer_km ?? ""} onChange={(event) => set("odometer_km", event.target.value === "" ? null : Number(event.target.value))} />
            </FieldShell>
            <FieldShell id={`${baseId}-last-service`} label="Last service date">
              <Input type="date" value={data.last_service_date || ""} onChange={(event) => set("last_service_date", event.target.value)} />
            </FieldShell>
            <FieldShell id={`${baseId}-notes`} label="Notes" className="sm:col-span-2">
              <Textarea rows={3} value={data.notes || ""} onChange={(event) => set("notes", event.target.value)} />
            </FieldShell>
          </div>
          <div className="mt-5 flex gap-2 border-t border-border pt-4 sm:justify-end">
            <Button type="button" variant="outline" size="touch" onClick={onClose} disabled={saving} className="flex-1 sm:flex-none">Cancel</Button>
            <Button type="submit" size="touch" disabled={saving} className="flex-1 sm:flex-none">
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {saving ? "Saving asset..." : "Save asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
