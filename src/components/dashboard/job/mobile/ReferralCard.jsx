import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["none", "pending", "completed"];

// Framework-only referral card: "Refer a friend for 10% off your next spend."
// No automated discount is applied — staff track eligibility/status manually
// until a discount engine is safely wired up.
export default function ReferralCard({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [saving, setSaving] = useState(false);

  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    setNotFound(false);
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
          .catch(() => { if (!cancelled) setNotFound(true); })
      );
    return () => { cancelled = true; };
  }, [customerId]);

  if (!customerId) return null;
  if (notFound) return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary"><Gift className="h-4 w-4" /></span>
        <div>
          <h3 className="font-heading text-sm font-extrabold text-foreground">Referral program</h3>
          <p className="text-xs text-muted-foreground">No customer account linked to this job yet.</p>
        </div>
      </div>
    </section>
  );
  if (!customer) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const set = (patch) => setCustomer((c) => ({ ...c, ...patch }));

  const save = async () => {
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
      toast.error(err.message || "Failed to save referral details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary"><Gift className="h-4 w-4" /></span>
        <div>
          <h3 className="font-heading text-sm font-extrabold text-foreground">Referral program</h3>
          <p className="text-xs text-muted-foreground">Refer a friend for 10% off your next spend (staff-only, manual for now).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Referral code</Label>
          <Input value={customer.referral_code || ""} onChange={(e) => set({ referral_code: e.target.value })} placeholder="e.g. SCOOT10-ABCD" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Referred by (customer id)</Label>
          <Input value={customer.referred_by_customer_id || ""} onChange={(e) => set({ referred_by_customer_id: e.target.value })} placeholder="Referring customer id" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Referral status</Label>
            <Select value={customer.referral_status || "none"} onValueChange={(v) => set({ referral_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Eligible for reward</Label>
            <Select value={customer.referral_eligible ? "yes" : "no"} onValueChange={(v) => set({ referral_eligible: v === "yes" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Staff-only referral notes</Label>
          <Textarea value={customer.referral_notes || ""} onChange={(e) => set({ referral_notes: e.target.value })} className="h-20" placeholder="Never shown to customers" />
        </div>
      </div>

      <Button size="sm" className="w-full gap-1.5 min-h-11" disabled={saving} onClick={save}>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save referral details
      </Button>
    </section>
  );
}