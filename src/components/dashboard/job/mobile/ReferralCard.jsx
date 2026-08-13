import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared";
import { getSafeErrorMessage } from "@/lib/errors";

const STATUSES = ["none", "pending", "completed"];

// Framework-only referral card: "Refer a friend for 10% off your next spend."
// No automated discount is applied — staff track eligibility/status manually
// until a discount engine is safely wired up.
export default function ReferralCard({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    setNotFound(false);
    setLoadError(false);
    setCustomer(null);
    // customerId may be the Customer entity record id (customer_account_id)
    // or the stable customer_id identifier. Try get() first, then filter fallback.
    base44.entities.Customer.get(customerId)
      .then((c) => { if (!cancelled) setCustomer(c); })
      .catch(() =>
        base44.entities.Customer.filter({ customer_id: customerId })
          .then((rows) => {
            if (cancelled) return;
            if (rows.length) setCustomer(rows[0]);
            else setNotFound(true);
          })
          .catch(() => { if (!cancelled) setLoadError(true); })
      );
    return () => { cancelled = true; };
  }, [customerId, reloadKey]);

  if (!customerId) return null;
  if (notFound) return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary"><Gift className="h-4 w-4" /></span>
        <div>
          <h3 className="font-heading text-sm font-extrabold text-foreground">Referral program</h3>
          <p className="text-xs text-muted-foreground">No customer account linked to this job yet.</p>
        </div>
      </div>
    </section>
  );
  if (loadError) return (
    <ErrorState
      title="Referral details could not be loaded"
      description="The customer record is still available elsewhere in this job. Retry this section when ready."
      onRetry={() => setReloadKey((key) => key + 1)}
    />
  );
  if (!customer) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const set = (patch) => setCustomer((c) => ({ ...c, ...patch }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await base44.entities.Customer.update(customer.id, {
        referral_code: customer.referral_code || "",
        referred_by_customer_id: customer.referred_by_customer_id || "",
        referral_status: customer.referral_status || "none",
        referral_eligible: !!customer.referral_eligible,
        referral_notes: customer.referral_notes || "",
      });
      toast.success("Referral details saved");
    } catch (err) {
      toast.error(getSafeErrorMessage(err, "Referral details could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary"><Gift className="h-4 w-4" /></span>
        <div>
          <h3 className="font-heading text-sm font-extrabold text-foreground">Referral program</h3>
          <p className="text-xs text-muted-foreground">Review referral attribution and reward eligibility for this customer.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="staff-referral-code" className="text-xs">Referral code</Label>
          <Input id="staff-referral-code" value={customer.referral_code || ""} onChange={(e) => set({ referral_code: e.target.value })} placeholder="e.g. SCOOT10-ABCD" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-referred-by" className="text-xs">Referred by (customer id)</Label>
          <Input id="staff-referred-by" value={customer.referred_by_customer_id || ""} onChange={(e) => set({ referred_by_customer_id: e.target.value })} placeholder="Referring customer id" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="staff-referral-status" className="text-xs">Referral status</Label>
            <Select value={customer.referral_status || "none"} onValueChange={(v) => set({ referral_status: v })}>
              <SelectTrigger id="staff-referral-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-referral-eligible" className="text-xs">Eligible for reward</Label>
            <Select value={customer.referral_eligible ? "yes" : "no"} onValueChange={(v) => set({ referral_eligible: v === "yes" })}>
              <SelectTrigger id="staff-referral-eligible"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-referral-notes" className="text-xs">Staff-only referral notes</Label>
          <Textarea id="staff-referral-notes" value={customer.referral_notes || ""} onChange={(e) => set({ referral_notes: e.target.value })} className="h-20" placeholder="Never shown to customers" />
        </div>
      </div>

      <Button size="sm" className="w-full gap-1.5 min-h-11" disabled={saving} onClick={save} aria-busy={saving || undefined}>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save referral details
      </Button>
    </section>
  );
}
