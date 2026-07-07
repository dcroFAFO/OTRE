import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneNumberField from "@/components/booking/PhoneNumberField";
import { normalizePhoneToE164 } from "@/lib/phone";
import { toast } from "sonner";
import { Loader2, UserRound } from "lucide-react";

export default function AccountDetailsCard({ profile, onSaved }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.name || "");
    setPhone(String(profile?.phone_e164 || "").replace(/^\+61/, "0"));
  }, [profile]);

  const save = async (e) => {
    e.preventDefault();
    setPhoneError(null);
    if (phone.trim() && !normalizePhoneToE164(phone).is_valid) {
      setPhoneError("Enter a valid Australian mobile number, e.g. 0412 345 678");
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("customerSettings", { action: "updateProfile", name: name.trim(), phone: phone.trim() });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Account details saved");
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Couldn't save your details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent"><UserRound className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="font-heading text-lg font-extrabold">Account details</h2>
          <p className="text-xs text-muted-foreground">Your contact details for bookings and updates.</p>
        </div>
      </div>

      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Name <span className="text-accent">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={profile?.email || ""} disabled className="opacity-70" />
          <p className="text-[11px] text-muted-foreground">Your email is linked to your login and can't be changed here.</p>
        </div>
        <PhoneNumberField label="Mobile" value={phone} onChange={(e) => setPhone(e.target.value)} error={phoneError} />
        <div className="flex items-end justify-end sm:col-start-2">
          <Button type="submit" disabled={saving || !name.trim()} className="rounded-xl">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save details"}
          </Button>
        </div>
      </form>
    </section>
  );
}