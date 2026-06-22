import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneNumberField from "@/components/booking/PhoneNumberField";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import { normalizePhoneToE164 } from "@/lib/phone";
import { Loader2, UserRound } from "lucide-react";

function oauthProviderName(user) {
  return user?.oauth_provider || user?.auth_provider || user?.provider || user?.provider_name || user?.identities?.[0]?.provider || "oauth";
}

function scooterComplete(form) {
  if (!form.scooter_make) return false;
  if (form.scooter_make === "Other") return !!form.asset_custom_make.trim() && !!form.asset_custom_model.trim();
  if (form.scooter_model === "Other model") return !!form.asset_custom_model.trim();
  return !!form.scooter_model;
}

function nextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/portal?book=1";
  return next.startsWith("/") ? next : "/portal?book=1";
}

export default function ProfileSetup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [form, setForm] = useState({ display_name: "", full_name: "", phone: "", scooter_make: "", scooter_model: "", scooter_make_model: "", asset_custom_make: "", asset_custom_model: "" });

  useEffect(() => {
    base44.auth.me().then((me) => {
      setUser(me);
      setForm((current) => ({ ...current, display_name: me.full_name || "", full_name: me.full_name || "" }));
    }).catch(() => base44.auth.redirectToLogin(window.location.href)).finally(() => setLoading(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setPhoneError(null);
    if (!scooterComplete(form)) return;
    const phone = form.phone.trim() ? normalizePhoneToE164(form.phone) : { is_valid: true, phone_e164: "" };
    if (!phone.is_valid) {
      setPhoneError("Enter a valid Australian mobile number");
      return;
    }
    setSaving(true);
    await base44.functions.invoke("claimCustomerJobs", {
      profile: {
        display_name: form.display_name.trim(),
        full_name: form.full_name.trim() || form.display_name.trim(),
        phone_e164: phone.phone_e164,
        oauth_provider: oauthProviderName(user),
        display_photo: user?.picture || user?.avatar_url || user?.photo_url || "",
        scooter_make: form.scooter_make === "Other" ? form.asset_custom_make : form.scooter_make,
        scooter_model: form.scooter_model === "Other model" ? form.asset_custom_model : form.scooter_model,
        scooter_make_model: form.scooter_make_model,
        default_scooter_make_model: form.scooter_make_model,
      },
    });
    window.location.href = nextPath();
  };

  if (loading) return <main className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></main>;

  return (
    <>
      <SEO title="Set Up Your Profile | OTR Scooters" description="Set up your customer profile before booking a repair." canonical="/profile-setup" noindex />
      <main className="min-h-screen bg-background px-5 py-10 text-foreground">
        <form onSubmit={submit} className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent"><UserRound className="h-6 w-6" /></span>
          <h1 className="mt-4 font-heading text-3xl font-extrabold">Finish your customer profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">Add a few details so your repair booking is ready inside your account.</p>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Display name <span className="text-accent">*</span></Label>
              <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="opacity-70" />
            </div>
            <PhoneNumberField label="Mobile" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} error={phoneError} />
            <div className="space-y-1.5">
              <Label>Scooter make/model</Label>
              <AssetBrandPicker
                make={form.scooter_make}
                model={form.scooter_model}
                customMake={form.asset_custom_make}
                customModel={form.asset_custom_model}
                onChange={({ make, model, customMake, customModel, label }) => setForm((f) => ({ ...f, scooter_make: make, scooter_model: model, asset_custom_make: customMake, asset_custom_model: customModel, scooter_make_model: label }))}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving || !form.display_name.trim() || !scooterComplete(form)} className="mt-6 w-full h-11 rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to book a job"}
          </Button>
        </form>
      </main>
    </>
  );
}