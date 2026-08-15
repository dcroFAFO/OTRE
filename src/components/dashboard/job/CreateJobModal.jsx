import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2, ClipboardList, User, Search, X, CheckCircle2, AlertCircle } from "lucide-react";
import { SCOOTER_BRANDS, BRAND_NAMES } from "@/config/scooterBrands";
import { DEFAULT_SERVICE_TYPE, SERVICE_TYPES, classifyServiceType } from "@/config/serviceTypes";
import { toast } from "sonner";
import { searchClients } from "@/services/clientService";

const BATTERY_CONDITIONS = [
  { key: "good", label: "Good" },
  { key: "fair", label: "Fair" },
  { key: "poor", label: "Poor" },
  { key: "faulty", label: "Faulty" },
  { key: "unknown", label: "Unknown" },
];

function blankIntake() {
  return {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    make: "",
    model: "",
    serial_number: "",
    battery_condition: "",
    battery_voltage: "",
    odometer_km: "",
    physical_condition: "",
    accessories_received: "",
    powers_on: true,
    initial_issue_notes: "",
    service_type: DEFAULT_SERVICE_TYPE,
    date: "",
    isRideable: undefined,
    priority: "medium",
  };
}

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Customer suggestion dropdown
function CustomerSuggestions({ suggestions, onSelect, loading }) {
  if (loading) {
    return (
      <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg p-2 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Searching…
      </div>
    );
  }
  if (!suggestions.length) return null;
  return (
    <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      {suggestions.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c)}
          className="w-full text-left px-3 py-2.5 text-sm hover:bg-secondary/60 flex items-start gap-2.5 border-b border-border last:border-0"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {(c.full_name || c.name || "?")[0].toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{c.full_name || c.name}</p>
            <p className="text-xs text-muted-foreground truncate">{[c.email, c.phone_display || c.phone].filter(Boolean).join(" · ")}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function CreateJobModal({ open, onClose, onCreated }) {
  const [intake, setIntake] = useState(blankIntake());
  const [linkedCustomer, setLinkedCustomer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Customer search state per field
  const [nameSearch, setNameSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState(null); // "name" | "email" | "phone"
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const debouncedName = useDebounce(nameSearch, 300);
  const debouncedEmail = useDebounce(emailSearch, 300);
  const debouncedPhone = useDebounce(phoneSearch, 300);

  // Run customer search
  const runSearch = useCallback(async (field, query) => {
    const q = String(query || "").trim();
    if (q.length < 2 || linkedCustomer) { setSuggestions([]); return; }
    setSearchLoading(true);
    try {
      setSuggestions(await searchClients(field, q));
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, [linkedCustomer]);

  useEffect(() => { if (activeSearch === "name") runSearch("name", debouncedName); }, [debouncedName, activeSearch]);
  useEffect(() => { if (activeSearch === "email") runSearch("email", debouncedEmail); }, [debouncedEmail, activeSearch]);
  useEffect(() => { if (activeSearch === "phone") runSearch("phone", debouncedPhone); }, [debouncedPhone, activeSearch]);

  const selectCustomer = (customer) => {
    setLinkedCustomer(customer);
    setSuggestions([]);
    setActiveSearch(null);
    setIntake((f) => ({
      ...f,
      customerName: customer.full_name || customer.name || "",
      customerEmail: customer.email || "",
      customerPhone: customer.phone_display || customer.phone || "",
    }));
    setNameSearch(customer.full_name || customer.name || "");
    setEmailSearch(customer.email || "");
    setPhoneSearch(customer.phone_display || customer.phone || "");
  };

  const clearCustomer = () => {
    setLinkedCustomer(null);
    setSuggestions([]);
  };

  const set = (k, v) => setIntake((f) => ({ ...f, [k]: v }));

  const models = intake.make ? (SCOOTER_BRANDS[intake.make] || []) : [];

  const handleClose = () => {
    setIntake(blankIntake());
    setLinkedCustomer(null);
    setSuggestions([]);
    setActiveSearch(null);
    setNameSearch("");
    setEmailSearch("");
    setPhoneSearch("");
    setError(null);
    setBusy(false);
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!intake.customerName.trim()) { setError("Customer name is required."); return; }
    if (!intake.customerEmail.trim() && !intake.customerPhone.trim()) {
      setError("Please provide at least an email or phone number to create or link the customer.");
      return;
    }
    setBusy(true);
    try {
      const res = await base44.functions.invoke("staffCreateJob", {
        intake,
        linked_customer_id: linkedCustomer?.id || linkedCustomer?.customer_id || null,
      });
      const job = res.data?.job;
      if (!job) throw new Error(res.data?.error || "Job creation failed");
      toast.success(`Job ${res.data.reference} created${res.data.is_new_customer ? " — new customer account created" : ""}`);
      onCreated?.(job);
      handleClose();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> New Staff Intake
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-1">

          {/* Customer section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="h-4 w-4 text-primary" /> Customer details
              {linkedCustomer && (
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Linked to existing customer
                  <button type="button" onClick={clearCustomer} className="ml-1 rounded hover:bg-secondary p-0.5">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* Name with search */}
              <div className="relative space-y-1">
                <Label htmlFor="new-job-customer-name" className="text-xs">Customer name <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="new-job-customer-name"
                    value={linkedCustomer ? (linkedCustomer.full_name || linkedCustomer.name || "") : nameSearch}
                    onChange={(e) => {
                      if (linkedCustomer) return;
                      const v = e.target.value;
                      setNameSearch(v);
                      set("customerName", v);
                      setActiveSearch("name");
                    }}
                    onFocus={() => { if (!linkedCustomer) setActiveSearch("name"); }}
                    onBlur={() => setTimeout(() => setActiveSearch(null), 200)}
                    placeholder="Jane Smith"
                    className="pl-8"
                    readOnly={!!linkedCustomer}
                  />
                </div>
                {activeSearch === "name" && (
                  <CustomerSuggestions suggestions={suggestions} onSelect={selectCustomer} loading={searchLoading} />
                )}
              </div>

              {/* Email with search */}
              <div className="relative space-y-1">
                <Label htmlFor="new-job-customer-email" className="text-xs">Email</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="new-job-customer-email"
                    type="email"
                    value={linkedCustomer ? (linkedCustomer.email || "") : emailSearch}
                    onChange={(e) => {
                      if (linkedCustomer) return;
                      const v = e.target.value;
                      setEmailSearch(v);
                      set("customerEmail", v);
                      setActiveSearch("email");
                    }}
                    onFocus={() => { if (!linkedCustomer) setActiveSearch("email"); }}
                    onBlur={() => setTimeout(() => setActiveSearch(null), 200)}
                    placeholder="jane@email.com"
                    className="pl-8"
                    readOnly={!!linkedCustomer}
                  />
                </div>
                {activeSearch === "email" && (
                  <CustomerSuggestions suggestions={suggestions} onSelect={selectCustomer} loading={searchLoading} />
                )}
              </div>

              {/* Phone with search */}
              <div className="relative space-y-1">
                <Label htmlFor="new-job-customer-phone" className="text-xs">Phone</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="new-job-customer-phone"
                    type="tel"
                    value={linkedCustomer ? (linkedCustomer.phone_display || linkedCustomer.phone || "") : phoneSearch}
                    onChange={(e) => {
                      if (linkedCustomer) return;
                      const v = e.target.value;
                      setPhoneSearch(v);
                      set("customerPhone", v);
                      setActiveSearch("phone");
                    }}
                    onFocus={() => { if (!linkedCustomer) setActiveSearch("phone"); }}
                    onBlur={() => setTimeout(() => setActiveSearch(null), 200)}
                    placeholder="04xx xxx xxx"
                    className="pl-8"
                    readOnly={!!linkedCustomer}
                  />
                </div>
                {activeSearch === "phone" && (
                  <CustomerSuggestions suggestions={suggestions} onSelect={selectCustomer} loading={searchLoading} />
                )}
              </div>
            </div>

            {!linkedCustomer && (intake.customerEmail || intake.customerPhone) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                No existing customer selected — a new customer account will be created using the details above.
              </p>
            )}
          </div>

          {/* Scooter details */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Scooter details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="new-job-make" className="text-xs">Make / brand</Label>
                <Select value={intake.make || ""} onValueChange={(v) => setIntake((f) => ({ ...f, make: v, model: "" }))}>
                  <SelectTrigger id="new-job-make"><SelectValue placeholder="Select make" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {BRAND_NAMES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-job-model" className="text-xs">Model</Label>
                {models.length > 0 ? (
                  <Select value={intake.model || ""} onValueChange={(v) => set("model", v)}>
                    <SelectTrigger id="new-job-model"><SelectValue placeholder="Select model" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="new-job-model" value={intake.model || ""} onChange={(e) => set("model", e.target.value)} placeholder="Model" />
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="new-job-serial" className="text-xs">Serial / frame no.</Label>
                <Input id="new-job-serial" value={intake.serial_number || ""} onChange={(e) => set("serial_number", e.target.value)} placeholder="SN-12345" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-job-battery-voltage" className="text-xs">Battery voltage</Label>
                <Input id="new-job-battery-voltage" value={intake.battery_voltage || ""} onChange={(e) => set("battery_voltage", e.target.value)} placeholder="e.g. 54.6V" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-job-odometer" className="text-xs">Odometer (km)</Label>
                <Input id="new-job-odometer" type="number" min="0" inputMode="numeric" value={intake.odometer_km ?? ""} onChange={(e) => set("odometer_km", e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="new-job-battery-condition" className="text-xs">Battery condition</Label>
                <Select value={intake.battery_condition || ""} onValueChange={(v) => set("battery_condition", v)}>
                  <SelectTrigger id="new-job-battery-condition"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {BATTERY_CONDITIONS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-job-rideable" className="text-xs">Rideable?</Label>
                <Select value={intake.isRideable === true ? "yes" : intake.isRideable === false ? "no" : ""} onValueChange={(v) => set("isRideable", v === "yes")}>
                  <SelectTrigger id="new-job-rideable"><SelectValue placeholder="Not assessed" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="new-job-powers-on" className="text-sm">Powers on at intake</Label>
              <Switch id="new-job-powers-on" checked={!!intake.powers_on} onCheckedChange={(v) => set("powers_on", v)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-job-condition" className="text-xs">Physical condition / existing damage</Label>
              <Textarea id="new-job-condition" value={intake.physical_condition || ""} onChange={(e) => set("physical_condition", e.target.value)} placeholder="Scratches, dents, worn tyres..." className="h-16" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-job-accessories" className="text-xs">Accessories received</Label>
              <Input id="new-job-accessories" value={intake.accessories_received || ""} onChange={(e) => set("accessories_received", e.target.value)} placeholder="Charger, key, phone mount..." />
            </div>
          </div>

          {/* Service / issue */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Service details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="new-job-service-type" className="text-xs">Service type</Label>
                <Select value={intake.service_type || DEFAULT_SERVICE_TYPE} onValueChange={(v) => set("service_type", v)}>
                  <SelectTrigger id="new-job-service-type"><SelectValue placeholder="Select service type" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {SERVICE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-job-priority" className="text-xs">Priority</Label>
                <Select value={intake.priority || "medium"} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger id="new-job-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-job-date" className="text-xs">Preferred date</Label>
              <Input id="new-job-date" type="date" value={intake.date || ""} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-job-issue" className="text-xs">Issue / requested service</Label>
              <Textarea
                id="new-job-issue"
                value={intake.initial_issue_notes || ""}
                onChange={(e) => setIntake((f) => ({
                  ...f,
                  initial_issue_notes: e.target.value,
                  service_type: f.service_type === DEFAULT_SERVICE_TYPE ? classifyServiceType(e.target.value) : f.service_type,
                }))}
                placeholder="Describe the issue or requested service..."
                className="h-24"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={busy}>Cancel</Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={!intake.customerName.trim() || busy}
            onClick={submit}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            {busy ? "Creating intake…" : "Create Intake & Job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
