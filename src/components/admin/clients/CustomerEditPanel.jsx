import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, X, Check, Loader2, Plus, Trash2, Bike, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCOOTER_BRANDS, BRAND_NAMES } from "@/config/scooterBrands";
import { CLIENT_STATUSES } from "@/config/clientConfig";
import { updateClient, listCustomerScooters, createScooter, updateScooter, deleteScooter, checkDuplicateContact } from "@/services/clientService";
import ClientTagEditor from "./ClientTagEditor";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

const STAFF_ROLES = new Set(["admin", "employee", "technician", "staff"]);

function normalizePhone(value) {
  let cleaned = String(value || "").trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+61")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("61")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned.replace(/\D/g, "")}`;
  return /^\+614\d{8}$/.test(phone) ? phone : "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function blankScooter() {
  return { make: "", model: "", year: "", serial_number: "", notes: "" };
}

// ── Single scooter row (view + edit) ────────────────────────────────────────
function ScooterRow({ scooter, customerName, actor, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(!scooter.id); // new rows open in edit mode
  const [form, setForm] = useState({ make: scooter.make || "", model: scooter.model || "", year: scooter.year || "", serial_number: scooter.serial_number || "", notes: scooter.notes || "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const models = form.make ? (SCOOTER_BRANDS[form.make] || []) : [];

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.model.trim()) { toast.error("Model is required"); return; }
    setSaving(true);
    try {
      if (scooter.id) {
        await updateScooter(scooter.id, form, customerName, actor);
        toast.success("Scooter updated");
      } else {
        await onUpdated({ ...form, _new: true });
        return;
      }
      setEditing(false);
      onUpdated();
    } catch (e) {
      logError("Scooter save failed", e);
      toast.error("Failed to save scooter");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!scooter.id) { onDeleted(); return; }
    setDeleting(true);
    try {
      await deleteScooter(scooter.id, customerName, actor);
      toast.success("Scooter removed");
      onDeleted();
    } catch (e) {
      logError("Scooter delete failed", e);
      toast.error("Failed to remove scooter");
    } finally { setDeleting(false); }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 group">
        <Bike className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{[scooter.make, scooter.model].filter(Boolean).join(" ") || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{[scooter.serial_number && `SN: ${scooter.serial_number}`, scooter.year].filter(Boolean).join(" · ")}</p>
          {scooter.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{scooter.notes}</p>}
        </div>
        <button type="button" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary transition-opacity">
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button type="button" onClick={remove} disabled={deleting} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity">
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Make</Label>
          <Select value={form.make || ""} onValueChange={(v) => setForm((f) => ({ ...f, make: v, model: "" }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select make" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {BRAND_NAMES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Model <span className="text-destructive">*</span></Label>
          {models.length > 0 ? (
            <Select value={form.model || ""} onValueChange={(v) => set("model", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select model" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Model" className="h-8 text-xs" />
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Year</Label>
          <Input value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="e.g. 2023" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Serial / frame no.</Label>
          <Input value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} placeholder="SN-12345" className="h-8 text-xs" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Notes</Label>
          <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any relevant notes..." className="h-8 text-xs" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 gap-1 text-xs" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {scooter.id ? "Save" : "Add"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => scooter.id ? setEditing(false) : onDeleted()}>
          <X className="h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Main CustomerEditPanel ───────────────────────────────────────────────────
export default function CustomerEditPanel({ customer, actor, onChange }) {
  const isStaff = STAFF_ROLES.has(String(actor?.role || "").toLowerCase());

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [scooters, setScooters] = useState([]);
  const [loadingScooters, setLoadingScooters] = useState(false);
  const [pendingNewScooter, setPendingNewScooter] = useState(null);

  useEffect(() => {
    if (customer) {
      setForm({ full_name: customer.full_name || "", email: customer.email || "", phone: customer.phone_display || customer.phone || "", status: customer.status || "active", tags: customer.tags || [] });
      loadScooters();
      setEditing(false);
      setFieldErrors({});
    }
  }, [customer?.id]);

  const loadScooters = async () => {
    if (!customer?.customer_id) return;
    setLoadingScooters(true);
    try { setScooters(await listCustomerScooters(customer.customer_id)); }
    catch (e) { logError("Load scooters failed", e); }
    finally { setLoadingScooters(false); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cancelEdit = () => {
    setForm({ full_name: customer.full_name || "", email: customer.email || "", phone: customer.phone_display || customer.phone || "", status: customer.status || "active", tags: customer.tags || [] });
    setEditing(false);
    setFieldErrors({});
    setPendingNewScooter(null);
  };

  const save = async () => {
    const errors = {};
    if (!form.full_name.trim()) errors.full_name = "Name is required";
    if (form.email && !isValidEmail(form.email)) errors.email = "Invalid email format";
    const e164 = form.phone ? normalizePhone(form.phone) : "";
    if (form.phone && !e164) errors.phone = "Invalid Australian mobile number (04xx xxx xxx)";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    // Duplicate contact check
    const { emailConflict, phoneConflict } = await checkDuplicateContact(
      form.email !== customer.email ? form.email : null,
      e164 && e164 !== customer.phone_e164 ? e164 : null,
      customer.id
    );
    if (emailConflict) {
      setFieldErrors((prev) => ({ ...prev, email: `This email already belongs to: ${emailConflict.full_name}` }));
      return;
    }
    if (phoneConflict) {
      setFieldErrors((prev) => ({ ...prev, phone: `This phone already belongs to: ${phoneConflict.full_name}` }));
      return;
    }

    setSaving(true);
    try {
      await updateClient(customer, {
        full_name: form.full_name.trim(),
        email: form.email?.trim().toLowerCase() || customer.email,
        phone: form.phone || customer.phone,
        phone_display: form.phone || customer.phone,
        phone_e164: e164 || customer.phone_e164,
        status: form.status,
        tags: form.tags,
      }, actor);
      toast.success("Customer updated");
      setEditing(false);
      setFieldErrors({});
      onChange?.();
    } catch (e) {
      logError("Save customer failed", e);
      toast.error("Failed to save — please try again");
    } finally { setSaving(false); }
  };

  const handleScooterUpdated = async (newData) => {
    if (newData?._new) {
      // Actually create the new scooter now
      try {
        await createScooter(customer.customer_id, { make: newData.make, model: newData.model, year: newData.year, serial_number: newData.serial_number, notes: newData.notes }, actor);
        toast.success("Scooter added");
        setPendingNewScooter(null);
        await loadScooters();
        onChange?.();
      } catch (e) {
        logError("Create scooter failed", e);
        toast.error("Failed to add scooter");
      }
    } else {
      await loadScooters();
      onChange?.();
    }
  };

  if (!customer || !form) return null;

  const canEdit = isStaff;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Profile</p>
        {canEdit && !editing && (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        )}
        {canEdit && editing && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEdit} disabled={saving}>
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
            <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Profile fields */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Full name {editing && <span className="text-destructive">*</span>}</Label>
          {editing ? (
            <>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={cn(fieldErrors.full_name && "border-destructive")} />
              {fieldErrors.full_name && <FieldError msg={fieldErrors.full_name} />}
            </>
          ) : (
            <ReadValue>{form.full_name || "—"}</ReadValue>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            {editing ? (
              <>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={cn(fieldErrors.email && "border-destructive")} />
                {fieldErrors.email && <FieldError msg={fieldErrors.email} />}
              </>
            ) : (
              <ReadValue>{form.email ? <a href={`mailto:${form.email}`} className="text-primary hover:underline">{form.email}</a> : "—"}</ReadValue>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phone</Label>
            {editing ? (
              <>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="04xx xxx xxx" className={cn(fieldErrors.phone && "border-destructive")} />
                {fieldErrors.phone && <FieldError msg={fieldErrors.phone} />}
              </>
            ) : (
              <ReadValue>{form.phone ? <a href={`tel:${form.phone}`} className="hover:underline">{form.phone}</a> : "—"}</ReadValue>
            )}
          </div>
        </div>

        {editing && (
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CLIENT_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {editing && (
          <div className="space-y-1">
            <Label className="text-xs">Tags / segments</Label>
            <ClientTagEditor value={form.tags} onChange={(v) => set("tags", v)} />
          </div>
        )}
      </div>

      {/* Scooters / Assets */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Bike className="h-3.5 w-3.5" /> Scooters / Assets
          </p>
          {canEdit && !pendingNewScooter && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setPendingNewScooter(blankScooter())}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>

        {loadingScooters ? (
          <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {scooters.map((s) => (
              <ScooterRow
                key={s.id}
                scooter={s}
                customerName={customer.full_name}
                actor={actor}
                onUpdated={handleScooterUpdated}
                onDeleted={async () => { await loadScooters(); onChange?.(); }}
              />
            ))}
            {scooters.length === 0 && !pendingNewScooter && (
              <p className="text-xs text-muted-foreground py-1">No scooters linked to this customer yet.</p>
            )}
            {pendingNewScooter && (
              <ScooterRow
                scooter={pendingNewScooter}
                customerName={customer.full_name}
                actor={actor}
                onUpdated={handleScooterUpdated}
                onDeleted={() => setPendingNewScooter(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReadValue({ children }) {
  return <p className="text-sm text-foreground py-1 px-0.5">{children}</p>;
}

function FieldError({ msg }) {
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
      <AlertCircle className="h-3 w-3 shrink-0" /> {msg}
    </p>
  );
}