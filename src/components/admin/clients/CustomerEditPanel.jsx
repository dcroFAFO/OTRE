import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, X, Check, Loader2, Plus, Trash2, Bike, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCOOTER_BRANDS, BRAND_NAMES } from "@/config/scooterBrands";
import { CLIENT_STATUSES } from "@/config/clientConfig";
import { updateClient, listCustomerScooters, createScooter, updateScooter, deleteScooter, checkDuplicateContact } from "@/services/clientService";
import ClientTagEditor from "./ClientTagEditor";
import AssetIntakeForm from "./AssetIntakeForm";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/errors";

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
  return { make: "", model: "", year: "", serial_number: "", colour: "", notes: "" };
}

// ── Single scooter row (view + edit) ────────────────────────────────────────
function ScooterRow({ scooter, customerName, actor, linkedToCurrentJob = false, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(!scooter.id); // new rows open in edit mode
  const [form, setForm] = useState({ make: scooter.make || "", model: scooter.model || "", year: scooter.year || "", serial_number: scooter.serial_number || "", colour: scooter.colour || scooter.color || "", notes: scooter.notes || "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const models = form.make ? (SCOOTER_BRANDS[form.make] || []) : [];

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (saving) return;
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
    if (deleting) return;
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
      <div className="space-y-1.5">
        <div className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
          <Bike className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-medium">{[scooter.make, scooter.model].filter(Boolean).join(" ") || "Unknown"}</p>
              {linkedToCurrentJob && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Linked to this job</span>}
            </div>
            <p className="text-xs text-muted-foreground">{[scooter.serial_number && `SN: ${scooter.serial_number}`, scooter.year, scooter.colour || scooter.color].filter(Boolean).join(" · ")}</p>
            <p className="text-xs text-muted-foreground">{Number(scooter.related_job_count || 0)} related jobs{scooter.last_service_date ? ` · Last service ${scooter.last_service_date}` : ""}</p>
            {scooter.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{scooter.notes}</p>}
          </div>
          <Button type="button" variant="ghost" size="iconTouch" onClick={() => setEditing(true)} className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label={`Edit ${[scooter.make, scooter.model].filter(Boolean).join(" ") || "scooter"}`}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="iconTouch" onClick={remove} disabled={deleting} className="text-destructive hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label={`Remove ${[scooter.make, scooter.model].filter(Boolean).join(" ") || "scooter"}`}>
            {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
          </Button>
        </div>
        {scooter.id && (
          <AssetIntakeForm scooter={scooter} customerName={customerName} actor={actor} onSaved={onUpdated} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`customer-scooter-make-${scooter.id || "new"}`} className="text-xs">Make</Label>
          <Select value={form.make || ""} onValueChange={(v) => setForm((f) => ({ ...f, make: v, model: "" }))}>
            <SelectTrigger id={`customer-scooter-make-${scooter.id || "new"}`}><SelectValue placeholder="Select make" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {BRAND_NAMES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`customer-scooter-model-${scooter.id || "new"}`} className="text-xs">Model <span className="text-destructive">*</span></Label>
          {models.length > 0 ? (
            <Select value={form.model || ""} onValueChange={(v) => set("model", v)}>
              <SelectTrigger id={`customer-scooter-model-${scooter.id || "new"}`}><SelectValue placeholder="Select model" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input id={`customer-scooter-model-${scooter.id || "new"}`} value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Model" />
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`customer-scooter-year-${scooter.id || "new"}`} className="text-xs">Year</Label>
          <Input id={`customer-scooter-year-${scooter.id || "new"}`} inputMode="numeric" value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="e.g. 2023" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`customer-scooter-serial-${scooter.id || "new"}`} className="text-xs">Serial / frame no.</Label>
          <Input id={`customer-scooter-serial-${scooter.id || "new"}`} value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} placeholder="SN-12345" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`customer-scooter-colour-${scooter.id || "new"}`} className="text-xs">Colour</Label>
          <Input id={`customer-scooter-colour-${scooter.id || "new"}`} value={form.colour} onChange={(e) => set("colour", e.target.value)} placeholder="Black" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`customer-scooter-notes-${scooter.id || "new"}`} className="text-xs">Notes</Label>
          <Input id={`customer-scooter-notes-${scooter.id || "new"}`} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any relevant notes..." />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="touch" className="gap-1 text-xs" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {scooter.id ? "Save" : "Add"}
        </Button>
        <Button type="button" size="touch" variant="ghost" className="text-xs" onClick={() => scooter.id ? setEditing(false) : onDeleted()} disabled={saving}>
          <X className="h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Main CustomerEditPanel ───────────────────────────────────────────────────
export default function CustomerEditPanel({ customer, actor, onChange, linkedAssetId = "", linkedAssetLabel = "" }) {
  const isStaff = STAFF_ROLES.has(String(actor?.role || "").toLowerCase());

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [scooters, setScooters] = useState([]);
  const [loadingScooters, setLoadingScooters] = useState(false);
  const [scooterError, setScooterError] = useState("");
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
    const customerKey = customer?.id;
    if (!customerKey) return;
    setLoadingScooters(true);
    setScooterError("");
    try { setScooters(await listCustomerScooters(customerKey)); }
    catch (e) { logError("Load scooters failed", e); setScooterError(getSafeErrorMessage(e, "Scooters could not be loaded.")); }
    finally { setLoadingScooters(false); }
  };

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((current) => ({ ...current, [k]: "" }));
  };

  const cancelEdit = () => {
    setForm({ full_name: customer.full_name || "", email: customer.email || "", phone: customer.phone_display || customer.phone || "", status: customer.status || "active", tags: customer.tags || [] });
    setEditing(false);
    setFieldErrors({});
    setPendingNewScooter(null);
  };

  const save = async () => {
    if (saving) return;
    const errors = /** @type {Record<string, string>} */ ({});
    if (!form.full_name.trim()) errors.full_name = "Name is required";
    if (form.email && !isValidEmail(form.email)) errors.email = "Invalid email format";
    const e164 = form.phone ? normalizePhone(form.phone) : "";
    if (form.phone && !e164) errors.phone = "Invalid Australian mobile number (04xx xxx xxx)";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0] === "full_name" ? "full-name" : Object.keys(errors)[0];
      document.getElementById(`customer-edit-${firstField}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      const { emailConflict, phoneConflict } = await checkDuplicateContact(
        form.email !== customer.email ? form.email : null,
        e164 && e164 !== customer.phone_e164 ? e164 : null,
        customer.id
      );
      if (emailConflict) {
        setFieldErrors((prev) => ({ ...prev, email: `This email already belongs to: ${emailConflict.full_name}` }));
        document.getElementById("customer-edit-email")?.focus();
        return;
      }
      if (phoneConflict) {
        setFieldErrors((prev) => ({ ...prev, phone: `This phone already belongs to: ${phoneConflict.full_name}` }));
        document.getElementById("customer-edit-phone")?.focus();
        return;
      }

      const updated = await updateClient(customer, {
        full_name: form.full_name.trim(),
        email: form.email?.trim().toLowerCase() || customer.email,
        phone: form.phone || customer.phone,
        phone_display: form.phone || customer.phone,
        phone_e164: e164 || customer.phone_e164,
        status: form.status,
        tags: form.tags,
      }, actor);
      setForm({ full_name: updated.full_name || "", email: updated.email || "", phone: updated.phone_display || updated.phone || "", status: updated.status || "active", tags: updated.tags || [] });
      toast.success("Customer updated");
      setEditing(false);
      setFieldErrors({});
      onChange?.(updated);
    } catch (e) {
      logError("Save customer failed", e);
      toast.error("Failed to save — please try again");
    } finally { setSaving(false); }
  };

  const handleScooterUpdated = async (newData) => {
    if (newData?._new) {
      // Actually create the new scooter now
      try {
        await createScooter(customer.id, { make: newData.make, model: newData.model, year: newData.year, serial_number: newData.serial_number, colour: newData.colour, color: newData.colour, notes: newData.notes }, actor);
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
  const linkedAssetKey = String(linkedAssetId || "").trim();
  const linkedAssetText = String(linkedAssetLabel || "").trim().toLowerCase();

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Account details</p>
        {canEdit && !editing && (
          <Button type="button" size="touch" variant="outline" className="gap-1.5 text-xs sm:h-9" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" /> Edit Customer
          </Button>
        )}
        {canEdit && editing && (
          <div className="flex gap-2">
            <Button type="button" size="touch" variant="ghost" className="text-xs sm:h-9" onClick={cancelEdit} disabled={saving}>
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
            <Button type="button" size="touch" className="gap-1.5 text-xs sm:h-9" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Profile fields */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="customer-edit-full-name" className="text-xs">Full name {editing && <span className="text-destructive">*</span>}</Label>
          {editing ? (
            <>
              <Input id="customer-edit-full-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} aria-invalid={Boolean(fieldErrors.full_name)} aria-describedby={fieldErrors.full_name ? "customer-edit-full-name-error" : undefined} className={cn(fieldErrors.full_name && "border-destructive")} />
              {fieldErrors.full_name && <FieldError id="customer-edit-full-name-error" msg={fieldErrors.full_name} />}
            </>
          ) : (
            <ReadValue>{form.full_name || "—"}</ReadValue>
          )}
        </div>

        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact details</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="customer-edit-email" className="text-xs">Email</Label>
            {editing ? (
              <>
                <Input id="customer-edit-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "customer-edit-email-error" : undefined} className={cn(fieldErrors.email && "border-destructive")} />
                {fieldErrors.email && <FieldError id="customer-edit-email-error" msg={fieldErrors.email} />}
              </>
            ) : (
              <ReadValue>{form.email ? <a href={`mailto:${form.email}`} className="text-primary hover:underline">{form.email}</a> : "—"}</ReadValue>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="customer-edit-phone" className="text-xs">Phone</Label>
            {editing ? (
              <>
                <Input id="customer-edit-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="04xx xxx xxx" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "customer-edit-phone-error" : undefined} className={cn(fieldErrors.phone && "border-destructive")} />
                {fieldErrors.phone && <FieldError id="customer-edit-phone-error" msg={fieldErrors.phone} />}
              </>
            ) : (
              <ReadValue>{form.phone ? <a href={`tel:${form.phone}`} className="hover:underline">{form.phone}</a> : "—"}</ReadValue>
            )}
          </div>
        </div>

        {editing && (
          <div className="space-y-1">
            <Label htmlFor="customer-edit-status" className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger id="customer-edit-status" className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{CLIENT_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {editing && (
          <div className="space-y-1">
            <p id="customer-edit-tags-label" className="text-xs font-medium">Tags / segments</p>
            <ClientTagEditor value={form.tags} onChange={(v) => set("tags", v)} labelledBy="customer-edit-tags-label" />
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
            <Button type="button" size="touch" variant="ghost" className="gap-1 text-xs sm:h-9" onClick={() => setPendingNewScooter(blankScooter())}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>

        {scooterError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
            <span>{scooterError}</span>
            <Button type="button" variant="outline" size="touch" className="text-xs sm:h-9" onClick={loadScooters}>Try again</Button>
          </div>
        ) : null}

        {loadingScooters ? (
          <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {scooters.map((s) => {
              const assetLabel = [s.make, s.model].filter(Boolean).join(" ");
              const linkedToCurrentJob = (linkedAssetKey && s.id === linkedAssetKey) || (linkedAssetText && assetLabel.toLowerCase() === linkedAssetText);
              return (
                <ScooterRow
                  key={s.id}
                  scooter={s}
                  customerName={customer.full_name}
                  actor={actor}
                  linkedToCurrentJob={linkedToCurrentJob}
                  onUpdated={handleScooterUpdated}
                  onDeleted={async () => { await loadScooters(); onChange?.(); }}
                />
              );
            })}
            {scooters.length === 0 && !pendingNewScooter && !scooterError && (
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

function FieldError({ id, msg }) {
  return (
    <p id={id} className="mt-0.5 flex items-center gap-1 text-xs text-destructive" role="alert">
      <AlertCircle className="h-3 w-3 shrink-0" /> {msg}
    </p>
  );
}
