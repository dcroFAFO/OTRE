import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PhoneNumberField from "@/components/booking/PhoneNumberField";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import { FieldShell, PageLoader } from "@/components/shared";
import { normalizePhoneToE164 } from "@/lib/phone";
import { getSafeErrorMessage } from "@/lib/errors";
import { AlertCircle, CheckCircle2, Loader2, UserRound } from "lucide-react";

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
  return next.startsWith("/") && !next.startsWith("//") ? next : "/portal?book=1";
}

export default function ProfileSetup() {
  const [user, setUser] = useState(/** @type {any} */ (null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [scooterError, setScooterError] = useState("");
  const [form, setForm] = useState({ display_name: "", full_name: "", phone: "", scooter_make: "", scooter_model: "", scooter_make_model: "", asset_custom_make: "", asset_custom_model: "", serial_number: "", colour: "", notes: "" });

  useEffect(() => {
    base44.auth.me().then((me) => {
      setUser(me);
      const oauthPhone = String(me.phone || me.phone_e164 || "").replace(/^\+61/, "0");
      setForm((current) => ({ ...current, display_name: me.full_name || "", full_name: me.full_name || "", phone: oauthPhone }));
    }).catch(() => base44.auth.redirectToLogin(window.location.href)).finally(() => setLoading(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaveError("");
    setNameError("");
    setPhoneError("");
    setScooterError("");

    if (!form.display_name.trim()) {
      setNameError("Enter the name you want us to use.");
      window.requestAnimationFrame(() => document.getElementById("profile-display-name")?.focus());
      return;
    }
    if (!scooterComplete(form)) {
      setScooterError("Select your scooter make and model. This is required to prepare your account.");
      window.requestAnimationFrame(() => document.getElementById("profile-scooter-make")?.focus());
      return;
    }
    const phone = form.phone.trim() ? normalizePhoneToE164(form.phone) : { is_valid: true, phone_e164: "" };
    if (!phone.is_valid) {
      setPhoneError("Enter a valid Australian mobile number.");
      window.requestAnimationFrame(() => document.getElementById("booking-phone")?.focus());
      return;
    }

    setSaving(true);
    try {
      const response = await base44.functions.invoke("claimCustomerJobs", {
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
          serial_number: form.serial_number.trim(),
          colour: form.colour.trim(),
          notes: form.notes.trim(),
        },
      });
      if (response.data?.error) throw Object.assign(new Error(response.data.error), { status: response.status || 400, response });
      window.location.href = nextPath();
    } catch (error) {
      setSaveError(getSafeErrorMessage(error, "We could not save your profile. Your details are still here, so please retry."));
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading your profile setup" />;

  return (
    <>
      <SEO title="Set Up Your Profile | On The Run Electrics" description="Set up your customer profile before booking a repair." canonical="/profile-setup" noindex />
      <main id="main-content" className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
        <form onSubmit={submit} noValidate aria-busy={saving} className="mx-auto max-w-xl rounded-lg border border-border bg-card p-5 shadow-xl sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><UserRound className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h1 className="font-heading text-2xl font-extrabold sm:text-3xl">Finish your customer profile</h1>
              <p className="mt-1 text-sm text-muted-foreground">Add the scooter you want us to recognise when you book or contact the workshop.</p>
            </div>
          </div>

          <div className="mt-6" aria-label="Profile setup progress">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" /> Account verified</span>
              <span className="text-muted-foreground">Profile details</span>
            </div>
            <Progress value={saving ? 85 : 60} aria-valuetext={saving ? "Saving profile" : "Account verified, profile details remaining"} />
          </div>

          {saveError ? (
            <Alert variant="destructive" className="mt-5">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Profile not saved</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-6 space-y-5">
            <FieldShell id="profile-display-name" label="Display name" required error={nameError || undefined}>
              <Input autoComplete="name" value={form.display_name} onChange={(event) => { setForm((current) => ({ ...current, display_name: event.target.value })); setNameError(""); }} />
            </FieldShell>
            <FieldShell id="profile-email" label="Email" hint="This is the verified email for your account.">
              <Input type="email" value={user?.email || ""} disabled />
            </FieldShell>
            <PhoneNumberField label="Mobile" value={form.phone} onChange={(event) => { setForm((current) => ({ ...current, phone: event.target.value })); setPhoneError(""); }} error={phoneError || null} />

            <fieldset aria-describedby={scooterError ? "profile-scooter-error" : "profile-scooter-hint"}>
              <legend className="mb-2 text-sm font-semibold">Scooter make and model <span className="text-destructive" aria-hidden="true">*</span></legend>
              <AssetBrandPicker
                id="profile-scooter"
                make={form.scooter_make}
                model={form.scooter_model}
                customMake={form.asset_custom_make}
                customModel={form.asset_custom_model}
                describedBy={scooterError ? "profile-scooter-error" : "profile-scooter-hint"}
                invalid={!!scooterError}
                onChange={({ make, model, customMake, customModel, label }) => {
                  setForm((current) => ({ ...current, scooter_make: make, scooter_model: model, asset_custom_make: customMake, asset_custom_model: customModel, scooter_make_model: label }));
                  setScooterError("");
                }}
              />
              <p id="profile-scooter-hint" className="mt-2 text-xs text-muted-foreground">Required so bookings and workshop updates show the correct scooter.</p>
              {scooterError ? <p id="profile-scooter-error" className="mt-2 text-sm text-destructive" role="alert">{scooterError}</p> : null}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell id="profile-serial" label="Serial or frame number">
                <Input value={form.serial_number} onChange={(event) => setForm((current) => ({ ...current, serial_number: event.target.value }))} placeholder="Optional" />
              </FieldShell>
              <FieldShell id="profile-colour" label="Colour">
                <Input value={form.colour} onChange={(event) => setForm((current) => ({ ...current, colour: event.target.value }))} placeholder="Optional" />
              </FieldShell>
            </div>
            <FieldShell id="profile-notes" label="Scooter notes" hint="Optional accessories, existing damage, or identifying details.">
              <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </FieldShell>
          </div>

          <Button type="submit" disabled={saving} className="mt-7 h-11 w-full">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Saving profile...</> : "Save profile and continue"}
          </Button>
        </form>
      </main>
    </>
  );
}
